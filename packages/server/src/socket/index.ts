import type { Server, Socket } from "socket.io";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { rooms, sessions, votes, users } from "../db/schema";
import { calcAverage } from "../lib/scoring";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../events";
import { generateId } from "../lib/id";
import {
  addParticipant,
  removeParticipant,
  getParticipants,
  markVoted,
  resetVotes,
  getMeta,
  getQueue,
  addToQueue,
  removeFromQueue,
  getFromQueue,
  clearQueue,
} from "./memory";
import { registerRetroHandlers, handleRetroDisconnect } from "./retro";
import type {
  JoinRoomPayload,
  VotePayload,
  RevealVotesPayload,
  SaveResultPayload,
  NewRoundPayload,
  AddToQueuePayload,
  RemoveFromQueuePayload,
  StartFromQueuePayload,
  RoomState,
} from "../types";


function buildRoomState(roomId: string): RoomState | null {
  const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get();
  if (!room) return null;

  const latestSession = db
    .select()
    .from(sessions)
    .where(eq(sessions.roomId, roomId))
    .orderBy(desc(sessions.createdAt))
    .limit(1)
    .get();

  const currentSession =
    latestSession && latestSession.result === null ? latestSession : null;

  const sessionVotes =
    currentSession && currentSession.revealedAt !== null
      ? db.select().from(votes).where(eq(votes.sessionId, currentSession.id)).all()
      : [];

  const average =
    sessionVotes.length > 0
      ? calcAverage(sessionVotes.map((v) => v.value))
      : null;

  return {
    room,
    participants: getParticipants(roomId),
    currentSession,
    votes: sessionVotes,
    average,
    storyQueue: getQueue(roomId),
  };
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`[socket] conectado: ${socket.id}`);

    socket.on(CLIENT_EVENTS.JOIN_ROOM, (payload: JoinRoomPayload) => {
      const { roomId, name, email, isModerator, role } = payload;
      const normalizedId = roomId.toUpperCase();

      const room = db.select().from(rooms).where(eq(rooms.id, normalizedId)).get();
      if (!room) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Sala no encontrada" });
        return;
      }

      // Upsert usuario
      const now = Date.now();
      const existing = db.select().from(users).where(eq(users.email, email)).get();
      if (existing) {
        db.update(users).set({ name, updatedAt: now }).where(eq(users.email, email)).run();
      } else {
        db.insert(users).values({ email, name, createdAt: now, updatedAt: now }).run();
      }

      socket.join(normalizedId);
      addParticipant(socket.id, normalizedId, name, email, isModerator, role ?? "Otro");

      // Estado completo al que se une
      const state = buildRoomState(normalizedId);
      if (state) socket.emit(SERVER_EVENTS.ROOM_STATE, state);

      // Avisar al resto
      socket.to(normalizedId).emit(SERVER_EVENTS.PARTICIPANT_JOINED, { name, role: role ?? "Otro" });
      console.log(`[socket] ${name} (${role ?? "Otro"}${isModerator ? ", mod" : ""}) se unió a ${normalizedId}`);
    });

    socket.on(CLIENT_EVENTS.VOTE, (payload: VotePayload) => {
      const meta = getMeta(socket.id);
      if (!meta) return;

      const { sessionId, value } = payload;
      const VALID_VALUES = ["1", "2", "3", "5", "8", "13", "21", "?"];
      if (!VALID_VALUES.includes(value)) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Valor de voto inválido" });
        return;
      }

      const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
      if (!session || session.revealedAt !== null) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Sesión inválida o ya revelada" });
        return;
      }

      // Upsert: si ya votó, actualizar
      const existing = db
        .select()
        .from(votes)
        .where(eq(votes.sessionId, sessionId))
        .all()
        .find((v) => v.participantName === meta.name);

      if (existing) {
        db.update(votes)
          .set({ value, participantRole: meta.role, createdAt: Date.now() })
          .where(eq(votes.id, existing.id))
          .run();
      } else {
        db.insert(votes)
          .values({
            id: generateId(),
            sessionId,
            participantName: meta.name,
            participantRole: meta.role,
            value,
            createdAt: Date.now(),
          })
          .run();
      }

      markVoted(meta.roomId, meta.name);
      io.to(meta.roomId).emit(SERVER_EVENTS.VOTE_CAST, {
        name: meta.name,
        hasVoted: true,
      });
      console.log(`[socket] ${meta.name} votó en sesión ${sessionId}`);
    });

    socket.on(CLIENT_EVENTS.REVEAL_VOTES, (payload: RevealVotesPayload) => {
      const meta = getMeta(socket.id);
      if (!meta || !meta.isModerator) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Solo el moderador puede revelar" });
        return;
      }

      const { sessionId } = payload;
      const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
      if (!session || session.revealedAt !== null) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Sesión inválida o ya revelada" });
        return;
      }

      const revealedAt = Date.now();
      db.update(sessions).set({ revealedAt }).where(eq(sessions.id, sessionId)).run();

      const sessionVotes = db
        .select()
        .from(votes)
        .where(eq(votes.sessionId, sessionId))
        .all();
      const average = calcAverage(sessionVotes.map((v) => v.value));

      io.to(meta.roomId).emit(SERVER_EVENTS.VOTES_REVEALED, {
        votes: sessionVotes,
        average,
      });
      console.log(`[socket] votos revelados en sesión ${sessionId}`);
    });

    socket.on(CLIENT_EVENTS.SAVE_RESULT, (payload: SaveResultPayload) => {
      const meta = getMeta(socket.id);
      if (!meta || !meta.isModerator) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Solo el moderador puede guardar" });
        return;
      }

      const { sessionId, result, devResult, qaResult } = payload;
      db.update(sessions).set({ result, devResult, qaResult }).where(eq(sessions.id, sessionId)).run();

      io.to(meta.roomId).emit(SERVER_EVENTS.RESULT_SAVED, { sessionId, result });
      // Actualizar isVoted en la cola para que los clientes sepan qué historias ya tienen resultado
      io.to(meta.roomId).emit(SERVER_EVENTS.QUEUE_UPDATED, { queue: getQueue(meta.roomId) });
      console.log(`[socket] resultado guardado: ${result} en sesión ${sessionId}`);
    });

    socket.on(CLIENT_EVENTS.NEW_ROUND, (payload: NewRoundPayload) => {
      const meta = getMeta(socket.id);
      if (!meta || !meta.isModerator) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Solo el moderador puede iniciar ronda" });
        return;
      }

      const { roomId, storyName, jiraKey } = payload;
      const normalizedId = roomId.toUpperCase();

      const session = {
        id: generateId(),
        roomId: normalizedId,
        storyName: storyName.trim(),
        jiraKey: jiraKey?.toUpperCase() ?? null,
        result: null,
        createdAt: Date.now(),
        revealedAt: null,
      };

      db.insert(sessions).values(session).run();
      resetVotes(normalizedId);

      io.to(normalizedId).emit(SERVER_EVENTS.ROUND_STARTED, { session });
      console.log(`[socket] nueva ronda "${storyName}" en sala ${normalizedId}`);
    });

    socket.on(CLIENT_EVENTS.ADD_TO_QUEUE, (payload: AddToQueuePayload) => {
      const meta = getMeta(socket.id);
      if (!meta) {
        console.warn(`[socket] ADD_TO_QUEUE: socket ${socket.id} no tiene meta (no hizo join_room?)`);
        socket.emit(SERVER_EVENTS.ERROR, { message: "No estás en ninguna sala. Recargá la página." });
        return;
      }
      if (!meta.isModerator) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Solo el moderador puede modificar la cola" });
        return;
      }

      const { roomId, storyName, jiraKey } = payload;
      const normalizedId = roomId.toUpperCase();

      try {
        addToQueue(normalizedId, storyName.trim(), jiraKey?.toUpperCase());
        io.to(normalizedId).emit(SERVER_EVENTS.QUEUE_UPDATED, { queue: getQueue(normalizedId) });
        console.log(`[socket] historia "${storyName}" agregada a cola de ${normalizedId}`);
      } catch (err) {
        console.error(`[socket] Error al agregar historia:`, err);
        socket.emit(SERVER_EVENTS.ERROR, { message: "Error al agregar la historia. Recargá la página." });
      }
    });

    socket.on(CLIENT_EVENTS.REMOVE_FROM_QUEUE, (payload: RemoveFromQueuePayload) => {
      const meta = getMeta(socket.id);
      if (!meta || !meta.isModerator) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Solo el moderador puede modificar la cola" });
        return;
      }

      const { roomId, storyId } = payload;
      const normalizedId = roomId.toUpperCase();

      removeFromQueue(normalizedId, storyId);
      io.to(normalizedId).emit(SERVER_EVENTS.QUEUE_UPDATED, { queue: getQueue(normalizedId) });
    });

    socket.on(CLIENT_EVENTS.START_FROM_QUEUE, (payload: StartFromQueuePayload) => {
      const meta = getMeta(socket.id);
      if (!meta || !meta.isModerator) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Solo el moderador puede iniciar ronda" });
        return;
      }

      const { roomId, storyId } = payload;
      const normalizedId = roomId.toUpperCase();

      const story = getFromQueue(normalizedId, storyId);
      if (!story) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Historia no encontrada en la cola" });
        return;
      }

      const session = {
        id: generateId(),
        roomId: normalizedId,
        storyName: story.storyName,
        jiraKey: story.jiraKey?.toUpperCase() ?? null,
        storyQueueId: story.id,
        result: null,
        createdAt: Date.now(),
        revealedAt: null,
      };

      db.insert(sessions).values(session).run();
      resetVotes(normalizedId);

      io.to(normalizedId).emit(SERVER_EVENTS.ROUND_STARTED, { session });
      console.log(`[socket] ronda iniciada desde cola: "${story.storyName}" en sala ${normalizedId}`);
    });

    socket.on(CLIENT_EVENTS.CLOSE_QUEUE, () => {
      const meta = getMeta(socket.id);
      if (!meta || !meta.isModerator) {
        socket.emit(SERVER_EVENTS.ERROR, { message: "Solo el moderador puede cerrar la sesión" });
        return;
      }
      clearQueue(meta.roomId);
      io.to(meta.roomId).emit(SERVER_EVENTS.QUEUE_UPDATED, { queue: [] });
      console.log(`[socket] cola cerrada en sala ${meta.roomId}`);
    });

    socket.on("disconnect", () => {
      const meta = removeParticipant(socket.id);
      if (meta) {
        io.to(meta.roomId).emit(SERVER_EVENTS.PARTICIPANT_LEFT, { name: meta.name });
        console.log(`[socket] ${meta.name} salió de ${meta.roomId}`);
      }
      handleRetroDisconnect(io, socket.id);
    });

    registerRetroHandlers(io, socket);
  });
}
