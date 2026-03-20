import type { Server, Socket } from "socket.io";
import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { retros, retroColumns, retroItems, retroVotes } from "../db/schema";
import { RETRO_CLIENT_EVENTS, RETRO_SERVER_EVENTS } from "../events";
import { generateId } from "../lib/id";
import {
  addRetroParticipant,
  removeRetroParticipant,
  getRetroParticipants,
  updateRetroCardCount,
  getRetroMeta,
  retroTimers,
} from "./retroMemory";
import type {
  RetroState,
  RetroItem,
  JoinRetroPayload,
  AddCardPayload,
  EditCardPayload,
  DeleteCardPayload,
  VoteCardPayload,
} from "../types";

function getRetroItems(retroId: string): RetroItem[] {
  return db
    .select()
    .from(retroItems)
    .where(eq(retroItems.retroId, retroId))
    .orderBy(asc(retroItems.createdAt))
    .all()
    .map((r) => ({
      id: r.id,
      retroId: r.retroId,
      columnId: r.columnId,
      content: r.content,
      votes: r.votes,
      createdAt: r.createdAt,
    }));
}

function countVotesUsed(retroId: string, email: string): number {
  const items = db
    .select()
    .from(retroItems)
    .where(eq(retroItems.retroId, retroId))
    .all();
  let total = 0;
  for (const item of items) {
    const v = db
      .select()
      .from(retroVotes)
      .where(eq(retroVotes.itemId, item.id))
      .all()
      .filter((v) => v.voterEmail === email);
    total += v.length;
  }
  return total;
}

function buildRetroState(retroId: string, email: string): RetroState | null {
  const retro = db.select().from(retros).where(eq(retros.id, retroId)).get();
  if (!retro) return null;

  const columns = db
    .select()
    .from(retroColumns)
    .where(eq(retroColumns.retroId, retroId))
    .orderBy(asc(retroColumns.position))
    .all()
    .map((c) => ({ id: c.id, retroId: c.retroId, title: c.title, emoji: c.emoji ?? null, position: c.position }));

  const participants = getRetroParticipants(retroId);

  const allItemRows = db
    .select()
    .from(retroItems)
    .where(eq(retroItems.retroId, retroId))
    .orderBy(asc(retroItems.createdAt))
    .all();

  const isPostReveal = retro.phase === "revealed" || retro.phase === "voting" || retro.phase === "closed";

  const myCards: RetroItem[] = allItemRows
    .filter((r) => r.authorEmail === email)
    .map((r) => ({ id: r.id, retroId: r.retroId, columnId: r.columnId, content: r.content, votes: r.votes, createdAt: r.createdAt }));

  const allCards: RetroItem[] = isPostReveal
    ? allItemRows.map((r) => ({ id: r.id, retroId: r.retroId, columnId: r.columnId, content: r.content, votes: r.votes, createdAt: r.createdAt }))
    : [];

  const votesUsed = isPostReveal ? countVotesUsed(retroId, email) : 0;
  const myVotesLeft = Math.max(0, retro.votesPerPerson - votesUsed);

  return {
    retro: {
      id: retro.id,
      title: retro.title,
      facilitatorEmail: retro.facilitatorEmail,
      roomId: retro.roomId ?? null,
      timerSeconds: retro.timerSeconds,
      writingEndsAt: retro.writingEndsAt ?? null,
      phase: retro.phase as RetroState["retro"]["phase"],
      votesPerPerson: retro.votesPerPerson,
      createdAt: retro.createdAt,
    },
    columns,
    participants,
    myCards,
    allCards,
    myVotesLeft,
  };
}

function revealRetro(io: Server, retroId: string): void {
  retroTimers.delete(retroId);
  db.update(retros).set({ phase: "revealed", writingEndsAt: null }).where(eq(retros.id, retroId)).run();

  const allItemRows = db
    .select()
    .from(retroItems)
    .where(eq(retroItems.retroId, retroId))
    .orderBy(asc(retroItems.createdAt))
    .all();

  const allCards: RetroItem[] = allItemRows.map((r) => ({
    id: r.id,
    retroId: r.retroId,
    columnId: r.columnId,
    content: r.content,
    votes: r.votes,
    createdAt: r.createdAt,
  }));

  io.to(retroId).emit(RETRO_SERVER_EVENTS.RETRO_REVEALED, { cards: allCards });
  io.to(retroId).emit(RETRO_SERVER_EVENTS.RETRO_PHASE_CHANGED, { phase: "revealed" });
  console.log(`[retro] votos revelados en ${retroId}`);
}

export function registerRetroHandlers(io: Server, socket: Socket): void {
  socket.on(RETRO_CLIENT_EVENTS.JOIN_RETRO, (payload: JoinRetroPayload) => {
    const { retroId, name, email } = payload;

    const retro = db.select().from(retros).where(eq(retros.id, retroId)).get();
    if (!retro) {
      socket.emit("error", { message: "Retrospectiva no encontrada" });
      return;
    }

    const myItemCount = db
      .select()
      .from(retroItems)
      .where(eq(retroItems.retroId, retroId))
      .all()
      .filter((r) => r.authorEmail === email).length;

    const isFacilitator = retro.facilitatorEmail === email;
    addRetroParticipant(socket.id, retroId, email, name, isFacilitator, myItemCount);

    socket.join(retroId);

    const state = buildRetroState(retroId, email);
    if (state) socket.emit(RETRO_SERVER_EVENTS.RETRO_STATE, state);

    socket.to(retroId).emit(RETRO_SERVER_EVENTS.RETRO_PARTICIPANT_JOINED, { name, email });
    console.log(`[retro] ${name} (${email}) se unió a retro ${retroId}`);
  });

  socket.on(RETRO_CLIENT_EVENTS.ADD_CARD, (payload: AddCardPayload) => {
    const meta = getRetroMeta(socket.id);
    if (!meta) return;

    const retro = db.select().from(retros).where(eq(retros.id, meta.retroId)).get();
    if (!retro || retro.phase !== "writing") {
      socket.emit("error", { message: "No se puede agregar tarjetas en esta fase" });
      return;
    }

    const { columnId, content } = payload;
    if (!content.trim()) return;

    const item = {
      id: generateId(),
      retroId: meta.retroId,
      columnId,
      authorEmail: meta.email,
      content: content.trim(),
      votes: 0,
      createdAt: Date.now(),
    };
    db.insert(retroItems).values(item).run();

    const myCount = db
      .select()
      .from(retroItems)
      .where(eq(retroItems.retroId, meta.retroId))
      .all()
      .filter((r) => r.authorEmail === meta.email).length;

    updateRetroCardCount(meta.retroId, meta.email, myCount);

    // Solo el autor recibe la tarjeta con contenido
    const publicItem: RetroItem = {
      id: item.id,
      retroId: item.retroId,
      columnId: item.columnId,
      content: item.content,
      votes: item.votes,
      createdAt: item.createdAt,
    };
    socket.emit(RETRO_SERVER_EVENTS.RETRO_CARD_ADDED, { card: publicItem });

    // Todos reciben los conteos actualizados
    const counts = getRetroParticipants(meta.retroId).map((p) => ({
      email: p.email,
      count: p.cardCount,
    }));
    io.to(meta.retroId).emit(RETRO_SERVER_EVENTS.RETRO_CARD_COUNTS, { counts });
  });

  socket.on(RETRO_CLIENT_EVENTS.EDIT_CARD, (payload: EditCardPayload) => {
    const meta = getRetroMeta(socket.id);
    if (!meta) return;

    const retro = db.select().from(retros).where(eq(retros.id, meta.retroId)).get();
    if (!retro || retro.phase !== "writing") return;

    const item = db.select().from(retroItems).where(eq(retroItems.id, payload.cardId)).get();
    if (!item || item.authorEmail !== meta.email) return;

    db.update(retroItems).set({ content: payload.content.trim() }).where(eq(retroItems.id, payload.cardId)).run();

    const updated: RetroItem = {
      id: item.id,
      retroId: item.retroId,
      columnId: item.columnId,
      content: payload.content.trim(),
      votes: item.votes,
      createdAt: item.createdAt,
    };
    socket.emit(RETRO_SERVER_EVENTS.RETRO_CARD_UPDATED, { card: updated });
  });

  socket.on(RETRO_CLIENT_EVENTS.DELETE_CARD, (payload: DeleteCardPayload) => {
    const meta = getRetroMeta(socket.id);
    if (!meta) return;

    const retro = db.select().from(retros).where(eq(retros.id, meta.retroId)).get();
    if (!retro || retro.phase !== "writing") return;

    const item = db.select().from(retroItems).where(eq(retroItems.id, payload.cardId)).get();
    if (!item || item.authorEmail !== meta.email) return;

    db.delete(retroItems).where(eq(retroItems.id, payload.cardId)).run();

    const myCount = db
      .select()
      .from(retroItems)
      .where(eq(retroItems.retroId, meta.retroId))
      .all()
      .filter((r) => r.authorEmail === meta.email).length;
    updateRetroCardCount(meta.retroId, meta.email, myCount);

    socket.emit(RETRO_SERVER_EVENTS.RETRO_CARD_DELETED, { cardId: payload.cardId });

    const counts = getRetroParticipants(meta.retroId).map((p) => ({
      email: p.email,
      count: p.cardCount,
    }));
    io.to(meta.retroId).emit(RETRO_SERVER_EVENTS.RETRO_CARD_COUNTS, { counts });
  });

  socket.on(RETRO_CLIENT_EVENTS.VOTE_CARD, (payload: VoteCardPayload) => {
    const meta = getRetroMeta(socket.id);
    if (!meta) return;

    const retro = db.select().from(retros).where(eq(retros.id, meta.retroId)).get();
    if (!retro || retro.phase !== "voting") {
      socket.emit("error", { message: "La votación no está activa" });
      return;
    }

    const used = countVotesUsed(meta.retroId, meta.email);
    if (used >= retro.votesPerPerson) {
      socket.emit("error", { message: "No tenés votos disponibles" });
      return;
    }

    const item = db.select().from(retroItems).where(eq(retroItems.id, payload.cardId)).get();
    if (!item || item.retroId !== meta.retroId) return;

    db.insert(retroVotes).values({ id: generateId(), itemId: payload.cardId, voterEmail: meta.email }).run();
    db.update(retroItems).set({ votes: item.votes + 1 }).where(eq(retroItems.id, payload.cardId)).run();

    const newVotesLeft = retro.votesPerPerson - used - 1;
    io.to(meta.retroId).emit(RETRO_SERVER_EVENTS.RETRO_CARD_VOTED, {
      cardId: payload.cardId,
      votes: item.votes + 1,
      voterEmail: meta.email,
      newVotesLeft,
    });
  });

  socket.on(RETRO_CLIENT_EVENTS.START_TIMER, (payload: { retroId: string }) => {
    const meta = getRetroMeta(socket.id);
    if (!meta || !meta.isFacilitator) return;

    const retro = db.select().from(retros).where(eq(retros.id, payload.retroId)).get();
    if (!retro || retro.phase !== "waiting") return;

    const writingEndsAt = Date.now() + retro.timerSeconds * 1000;
    db.update(retros).set({ phase: "writing", writingEndsAt }).where(eq(retros.id, payload.retroId)).run();

    io.to(payload.retroId).emit(RETRO_SERVER_EVENTS.RETRO_PHASE_CHANGED, {
      phase: "writing",
      writingEndsAt,
    });

    const timer = setTimeout(() => {
      revealRetro(io, payload.retroId);
    }, retro.timerSeconds * 1000);
    retroTimers.set(payload.retroId, timer);

    console.log(`[retro] timer iniciado en ${payload.retroId} (${retro.timerSeconds}s)`);
  });

  socket.on(RETRO_CLIENT_EVENTS.REVEAL_NOW, (payload: { retroId: string }) => {
    const meta = getRetroMeta(socket.id);
    if (!meta || !meta.isFacilitator) return;

    const existing = retroTimers.get(payload.retroId);
    if (existing) clearTimeout(existing);

    revealRetro(io, payload.retroId);
  });

  socket.on(RETRO_CLIENT_EVENTS.START_VOTING, (payload: { retroId: string }) => {
    const meta = getRetroMeta(socket.id);
    if (!meta || !meta.isFacilitator) return;

    const retro = db.select().from(retros).where(eq(retros.id, payload.retroId)).get();
    if (!retro || retro.phase !== "revealed") return;

    db.update(retros).set({ phase: "voting" }).where(eq(retros.id, payload.retroId)).run();
    io.to(payload.retroId).emit(RETRO_SERVER_EVENTS.RETRO_PHASE_CHANGED, { phase: "voting" });
    console.log(`[retro] votación iniciada en ${payload.retroId}`);
  });

  socket.on(RETRO_CLIENT_EVENTS.CLOSE_RETRO, (payload: { retroId: string }) => {
    const meta = getRetroMeta(socket.id);
    if (!meta || !meta.isFacilitator) return;

    db.update(retros).set({ phase: "closed" }).where(eq(retros.id, payload.retroId)).run();
    io.to(payload.retroId).emit(RETRO_SERVER_EVENTS.RETRO_PHASE_CHANGED, { phase: "closed" });
    console.log(`[retro] retro cerrada ${payload.retroId}`);
  });
}

export function handleRetroDisconnect(io: Server, socketId: string): void {
  const meta = removeRetroParticipant(socketId);
  if (meta) {
    io.to(meta.retroId).emit(RETRO_SERVER_EVENTS.RETRO_PARTICIPANT_LEFT, { name: meta.name, email: meta.email });
  }
}
