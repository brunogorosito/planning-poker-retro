import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { storyQueue as storyQueueTable, sessions } from "../db/schema";
import { generateId } from "../lib/id";
import type { Participant, ParticipantRole, PlannedStory } from "../types";

interface SocketMeta {
  roomId: string;
  name: string;
  email: string;
  isModerator: boolean;
  role: ParticipantRole;
}

// socketId → metadata del socket
const socketMap = new Map<string, SocketMeta>();

// roomId → participantes (por nombre para dedup en reconexión)
const roomParticipants = new Map<string, Map<string, Participant>>();

export function addParticipant(
  socketId: string,
  roomId: string,
  name: string,
  email: string,
  isModerator: boolean,
  role: ParticipantRole
): void {
  socketMap.set(socketId, { roomId, name, email, isModerator, role });

  if (!roomParticipants.has(roomId)) {
    roomParticipants.set(roomId, new Map());
  }
  roomParticipants.get(roomId)!.set(name, { name, isModerator, hasVoted: false, role });
}

export function removeParticipant(socketId: string): SocketMeta | undefined {
  const meta = socketMap.get(socketId);
  if (!meta) return undefined;

  socketMap.delete(socketId);

  // Solo eliminar si no hay otro socket con el mismo nombre en la sala
  const otherSocket = [...socketMap.values()].find(
    (m) => m.roomId === meta.roomId && m.name === meta.name
  );
  if (!otherSocket) {
    roomParticipants.get(meta.roomId)?.delete(meta.name);
  }

  return meta;
}

export function getParticipants(roomId: string): Participant[] {
  return [...(roomParticipants.get(roomId)?.values() ?? [])];
}

export function markVoted(roomId: string, name: string): void {
  const p = roomParticipants.get(roomId)?.get(name);
  if (p) p.hasVoted = true;
}

export function resetVotes(roomId: string): void {
  roomParticipants.get(roomId)?.forEach((p) => {
    p.hasVoted = false;
  });
}

export function getMeta(socketId: string): SocketMeta | undefined {
  return socketMap.get(socketId);
}

// Queue management — persisted in SQLite
export function getQueue(roomId: string): PlannedStory[] {
  const rows = db
    .select()
    .from(storyQueueTable)
    .where(eq(storyQueueTable.roomId, roomId))
    .orderBy(asc(storyQueueTable.position))
    .all();

  // IDs de items de la cola que ya tienen sesión con resultado guardado
  const votedIds = new Set(
    db
      .select()
      .from(sessions)
      .where(eq(sessions.roomId, roomId))
      .all()
      .filter((s) => s.result !== null && s.storyQueueId !== null)
      .map((s) => s.storyQueueId as string)
  );

  return rows.map((row) => ({
    id: row.id,
    storyName: row.storyName,
    jiraKey: row.jiraKey ?? undefined,
    isVoted: votedIds.has(row.id),
  }));
}

export function clearQueue(roomId: string): void {
  db.delete(storyQueueTable).where(eq(storyQueueTable.roomId, roomId)).run();
}

export function addToQueue(roomId: string, storyName: string, jiraKey?: string): PlannedStory {
  const existing = db
    .select({ position: storyQueueTable.position })
    .from(storyQueueTable)
    .where(eq(storyQueueTable.roomId, roomId))
    .orderBy(asc(storyQueueTable.position))
    .all();
  const maxPosition = existing.length > 0 ? Math.max(...existing.map((r) => r.position)) : 0;

  const story: PlannedStory = { id: generateId(), storyName, jiraKey };
  db.insert(storyQueueTable)
    .values({
      id: story.id,
      roomId,
      storyName,
      jiraKey: jiraKey ?? null,
      position: maxPosition + 1,
      createdAt: Date.now(),
    })
    .run();
  return story;
}

export function removeFromQueue(roomId: string, storyId: string): boolean {
  const row = db
    .select()
    .from(storyQueueTable)
    .where(eq(storyQueueTable.id, storyId))
    .get();
  if (!row || row.roomId !== roomId) return false;
  db.delete(storyQueueTable).where(eq(storyQueueTable.id, storyId)).run();
  return true;
}

export function getFromQueue(roomId: string, storyId: string): PlannedStory | undefined {
  const row = db
    .select()
    .from(storyQueueTable)
    .where(eq(storyQueueTable.id, storyId))
    .get();
  if (!row || row.roomId !== roomId) return undefined;
  return { id: row.id, storyName: row.storyName, jiraKey: row.jiraKey ?? undefined };
}

export function popFromQueue(roomId: string, storyId: string): PlannedStory | undefined {
  const row = db
    .select()
    .from(storyQueueTable)
    .where(eq(storyQueueTable.id, storyId))
    .get();
  if (!row || row.roomId !== roomId) return undefined;
  db.delete(storyQueueTable).where(eq(storyQueueTable.id, storyId)).run();
  return { id: row.id, storyName: row.storyName, jiraKey: row.jiraKey ?? undefined };
}
