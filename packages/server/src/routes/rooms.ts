import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { rooms, sessions, votes } from "../db/schema";
import { generateId, generateRoomCode } from "../lib/id";

const router = Router();

// POST /api/rooms — crear sala
router.post("/", (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name es requerido" });
    return;
  }

  const id = generateRoomCode();
  const now = Date.now();

  db.insert(rooms).values({ id, name: name.trim(), createdAt: now }).run();

  res.status(201).json({ id, name: name.trim(), createdAt: now });
});

// GET /api/rooms/:id — sala + sesión activa
router.get("/:id", (req, res) => {
  const room = db
    .select()
    .from(rooms)
    .where(eq(rooms.id, req.params.id.toUpperCase()))
    .get();

  if (!room) {
    res.status(404).json({ error: "Sala no encontrada" });
    return;
  }

  // Sesión activa = la más reciente sin result (no cerrada)
  const activeSession = db
    .select()
    .from(sessions)
    .where(eq(sessions.roomId, room.id))
    .orderBy(desc(sessions.createdAt))
    .limit(1)
    .get();

  const currentSession =
    activeSession && activeSession.result === null ? activeSession : null;

  // Votos de la sesión activa (si la hay y ya fue revelada)
  const currentVotes =
    currentSession && currentSession.revealedAt !== null
      ? db
          .select()
          .from(votes)
          .where(eq(votes.sessionId, currentSession.id))
          .all()
      : [];

  res.json({ room, currentSession, currentVotes });
});

// GET /api/rooms/:id/history — historial de sesiones cerradas
router.get("/:id/history", (req, res) => {
  const roomId = req.params.id.toUpperCase();

  const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get();
  if (!room) {
    res.status(404).json({ error: "Sala no encontrada" });
    return;
  }

  const closedSessions = db
    .select()
    .from(sessions)
    .where(eq(sessions.roomId, roomId))
    .orderBy(desc(sessions.createdAt))
    .all()
    .filter((s) => s.result !== null);

  const history = closedSessions.map((session) => {
    const sessionVotes = db
      .select()
      .from(votes)
      .where(eq(votes.sessionId, session.id))
      .all();
    return { session, votes: sessionVotes };
  });

  res.json({ history });
});

export default router;
