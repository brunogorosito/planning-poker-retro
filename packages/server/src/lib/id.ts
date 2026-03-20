import { randomBytes } from "crypto";

/** Genera un código de sala tipo ABC123 */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(randomBytes(6))
    .map((b) => chars[b % chars.length])
    .join("");
}

/** Genera un UUID v4 simplificado */
export function generateId(): string {
  return randomBytes(16).toString("hex");
}
