import type { RetroParticipant } from "../types";

interface RetroSocketMeta {
  retroId: string;
  email: string;
  name: string;
  isFacilitator: boolean;
}

const retroSocketMap = new Map<string, RetroSocketMeta>();
const retroParticipants = new Map<string, Map<string, RetroParticipant>>();
export const retroTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function addRetroParticipant(
  socketId: string,
  retroId: string,
  email: string,
  name: string,
  isFacilitator: boolean,
  cardCount: number
): void {
  retroSocketMap.set(socketId, { retroId, email, name, isFacilitator });
  if (!retroParticipants.has(retroId)) {
    retroParticipants.set(retroId, new Map());
  }
  retroParticipants.get(retroId)!.set(email, { email, name, isFacilitator, cardCount });
}

export function removeRetroParticipant(socketId: string): RetroSocketMeta | undefined {
  const meta = retroSocketMap.get(socketId);
  if (!meta) return undefined;
  retroSocketMap.delete(socketId);
  const otherSocket = [...retroSocketMap.values()].find(
    (m) => m.retroId === meta.retroId && m.email === meta.email
  );
  if (!otherSocket) {
    retroParticipants.get(meta.retroId)?.delete(meta.email);
  }
  return meta;
}

export function getRetroParticipants(retroId: string): RetroParticipant[] {
  return [...(retroParticipants.get(retroId)?.values() ?? [])];
}

export function updateRetroCardCount(retroId: string, email: string, count: number): void {
  const p = retroParticipants.get(retroId)?.get(email);
  if (p) p.cardCount = count;
}

export function getRetroMeta(socketId: string): RetroSocketMeta | undefined {
  return retroSocketMap.get(socketId);
}
