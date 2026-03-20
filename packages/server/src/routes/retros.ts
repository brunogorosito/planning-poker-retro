import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { retros, retroColumns } from "../db/schema";
import { generateId } from "../lib/id";
import type { CreateRetroPayload } from "../types";

const router = Router();

// POST /api/retros — crear retro
router.post("/", (req, res) => {
  const { title, timerSeconds, votesPerPerson, facilitatorEmail, roomId, columns } =
    req.body as CreateRetroPayload;

  if (!title?.trim() || !facilitatorEmail || !columns?.length) {
    res.status(400).json({ error: "Faltan campos requeridos" });
    return;
  }

  const id = generateId();
  const now = Date.now();

  db.insert(retros)
    .values({
      id,
      title: title.trim(),
      facilitatorEmail,
      roomId: roomId ?? null,
      timerSeconds: timerSeconds ?? 300,
      votesPerPerson: votesPerPerson ?? 5,
      phase: "waiting",
      createdAt: now,
    })
    .run();

  columns.forEach((col, idx) => {
    db.insert(retroColumns)
      .values({
        id: generateId(),
        retroId: id,
        title: col.title,
        emoji: col.emoji ?? null,
        position: idx + 1,
      })
      .run();
  });

  res.status(201).json({ id });
});

// GET /api/retros/:id — info de la retro (para unirse)
router.get("/:id", (req, res) => {
  const retro = db.select().from(retros).where(eq(retros.id, req.params.id)).get();
  if (!retro) {
    res.status(404).json({ error: "Retrospectiva no encontrada" });
    return;
  }

  const columns = db
    .select()
    .from(retroColumns)
    .where(eq(retroColumns.retroId, retro.id))
    .orderBy(asc(retroColumns.position))
    .all();

  res.json({ retro, columns });
});

export default router;
