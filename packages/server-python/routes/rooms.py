from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import fetchone, fetchall, execute, generate_id, generate_room_code, row_to_camel, now_ms

router = APIRouter()


class CreateRoomBody(BaseModel):
    name: str


@router.post("", status_code=201)
async def create_room(body: CreateRoomBody):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name es requerido")

    room_id = generate_room_code()
    ts = now_ms()
    name = body.name.strip()
    execute("INSERT INTO rooms (id, name, created_at) VALUES (?, ?, ?)", (room_id, name, ts))
    return {"id": room_id, "name": name, "createdAt": ts}


@router.get("/{room_id}")
async def get_room(room_id: str):
    room = fetchone("SELECT * FROM rooms WHERE id = ?", (room_id.upper(),))
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    active = fetchone(
        "SELECT * FROM sessions WHERE room_id = ? ORDER BY created_at DESC LIMIT 1",
        (room["id"],),
    )
    current_session = active if active and active["result"] is None else None

    current_votes = []
    if current_session and current_session["revealed_at"] is not None:
        current_votes = fetchall(
            "SELECT * FROM votes WHERE session_id = ?", (current_session["id"],)
        )

    return {
        "room": row_to_camel(room),
        "currentSession": row_to_camel(current_session) if current_session else None,
        "currentVotes": [row_to_camel(v) for v in current_votes],
    }


@router.get("/{room_id}/history")
async def get_room_history(room_id: str):
    upper_id = room_id.upper()
    room = fetchone("SELECT * FROM rooms WHERE id = ?", (upper_id,))
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    all_sessions = fetchall(
        "SELECT * FROM sessions WHERE room_id = ? ORDER BY created_at DESC", (upper_id,)
    )
    closed = [s for s in all_sessions if s["result"] is not None]

    history = []
    for session in closed:
        session_votes = fetchall("SELECT * FROM votes WHERE session_id = ?", (session["id"],))
        history.append({
            "session": row_to_camel(session),
            "votes": [row_to_camel(v) for v in session_votes],
        })

    return {"history": history}
