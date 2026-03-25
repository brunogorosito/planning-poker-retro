from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import fetchone, fetchall, execute, generate_id, row_to_camel, now_ms

router = APIRouter()


class ColumnSpec(BaseModel):
    title: str
    emoji: Optional[str] = None


class CreateRetroBody(BaseModel):
    title: str
    timerSeconds: int = 300
    votesPerPerson: int = 5
    facilitatorEmail: str
    roomId: Optional[str] = None
    columns: list[ColumnSpec]


@router.post("", status_code=201)
async def create_retro(body: CreateRetroBody):
    if not body.title.strip() or not body.facilitatorEmail or not body.columns:
        raise HTTPException(status_code=400, detail="Faltan campos requeridos")

    retro_id = generate_id()
    ts = now_ms()

    execute(
        "INSERT INTO retros (id, title, facilitator_email, room_id, timer_seconds, "
        "votes_per_person, phase, created_at) VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?)",
        (
            retro_id,
            body.title.strip(),
            body.facilitatorEmail,
            body.roomId,
            body.timerSeconds,
            body.votesPerPerson,
            ts,
        ),
    )

    for idx, col in enumerate(body.columns):
        execute(
            "INSERT INTO retro_columns (id, retro_id, title, emoji, position) VALUES (?, ?, ?, ?, ?)",
            (generate_id(), retro_id, col.title, col.emoji, idx + 1),
        )

    return {"id": retro_id}


@router.get("/{retro_id}")
async def get_retro(retro_id: str):
    retro = fetchone("SELECT * FROM retros WHERE id = ?", (retro_id,))
    if not retro:
        raise HTTPException(status_code=404, detail="Retrospectiva no encontrada")

    columns = fetchall(
        "SELECT * FROM retro_columns WHERE retro_id = ? ORDER BY position ASC", (retro_id,)
    )

    return {
        "retro": row_to_camel(retro),
        "columns": [row_to_camel(c) for c in columns],
    }
