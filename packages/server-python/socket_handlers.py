import socketio

from db import (
    fetchone, fetchall, execute,
    generate_id, row_to_camel, calc_average, now_ms,
)
from memory import (
    add_participant, get_participants,
    mark_voted, reset_votes, get_meta,
    get_queue, add_to_queue, remove_from_queue, get_from_queue, clear_queue,
)

VALID_VOTES = {"1", "2", "3", "5", "8", "13", "21", "?"}


def build_room_state(room_id: str) -> dict | None:
    room = fetchone("SELECT * FROM rooms WHERE id = ?", (room_id,))
    if not room:
        return None

    latest = fetchone(
        "SELECT * FROM sessions WHERE room_id = ? ORDER BY created_at DESC LIMIT 1",
        (room_id,),
    )
    current_session = latest if latest and latest["result"] is None else None

    votes = []
    average = None
    if current_session and current_session["revealed_at"] is not None:
        votes = fetchall("SELECT * FROM votes WHERE session_id = ?", (current_session["id"],))
        average = calc_average([v["value"] for v in votes])

    return {
        "room": row_to_camel(room),
        "participants": get_participants(room_id),
        "currentSession": row_to_camel(current_session) if current_session else None,
        "votes": [row_to_camel(v) for v in votes],
        "average": average,
        "storyQueue": get_queue(room_id),
    }


def register_handlers(sio: socketio.AsyncServer) -> None:

    @sio.on("join_room")
    async def join_room(sid, data):
        room_id = data.get("roomId", "").upper()
        name = data.get("name", "")
        email = data.get("email", "")
        is_moderator = data.get("isModerator", False)
        role = data.get("role", "Otro")

        room = fetchone("SELECT * FROM rooms WHERE id = ?", (room_id,))
        if not room:
            await sio.emit("error", {"message": "Sala no encontrada"}, to=sid)
            return

        ts = now_ms()
        existing_user = fetchone("SELECT * FROM users WHERE email = ?", (email,))
        if existing_user:
            execute("UPDATE users SET name = ?, updated_at = ? WHERE email = ?", (name, ts, email))
        else:
            execute(
                "INSERT INTO users (email, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (email, name, ts, ts),
            )

        await sio.enter_room(sid, room_id)
        add_participant(sid, room_id, name, email, is_moderator, role)

        state = build_room_state(room_id)
        if state:
            await sio.emit("room_state", state, to=sid)

        await sio.emit(
            "participant_joined", {"name": name, "role": role},
            room=room_id, skip_sid=sid,
        )
        print(f"[socket] {name} ({role}{', mod' if is_moderator else ''}) se unió a {room_id}")

    @sio.on("vote")
    async def vote(sid, data):
        meta = get_meta(sid)
        if not meta:
            return

        session_id = data.get("sessionId")
        value = data.get("value")

        if value not in VALID_VOTES:
            await sio.emit("error", {"message": "Valor de voto inválido"}, to=sid)
            return

        session = fetchone("SELECT * FROM sessions WHERE id = ?", (session_id,))
        if not session or session["revealed_at"] is not None:
            await sio.emit("error", {"message": "Sesión inválida o ya revelada"}, to=sid)
            return

        existing = next(
            (v for v in fetchall("SELECT * FROM votes WHERE session_id = ?", (session_id,))
             if v["participant_name"] == meta["name"]),
            None,
        )

        ts = now_ms()
        if existing:
            execute(
                "UPDATE votes SET value = ?, participant_role = ?, created_at = ? WHERE id = ?",
                (value, meta["role"], ts, existing["id"]),
            )
        else:
            execute(
                "INSERT INTO votes (id, session_id, participant_name, participant_role, value, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (generate_id(), session_id, meta["name"], meta["role"], value, ts),
            )

        mark_voted(meta["roomId"], meta["name"])
        await sio.emit("vote_cast", {"name": meta["name"], "hasVoted": True}, room=meta["roomId"])
        print(f"[socket] {meta['name']} votó en sesión {session_id}")

    @sio.on("reveal_votes")
    async def reveal_votes(sid, data):
        meta = get_meta(sid)
        if not meta or not meta["isModerator"]:
            await sio.emit("error", {"message": "Solo el moderador puede revelar"}, to=sid)
            return

        session_id = data.get("sessionId")
        session = fetchone("SELECT * FROM sessions WHERE id = ?", (session_id,))
        if not session or session["revealed_at"] is not None:
            await sio.emit("error", {"message": "Sesión inválida o ya revelada"}, to=sid)
            return

        ts = now_ms()
        execute("UPDATE sessions SET revealed_at = ? WHERE id = ?", (ts, session_id))

        votes = fetchall("SELECT * FROM votes WHERE session_id = ?", (session_id,))
        average = calc_average([v["value"] for v in votes])

        await sio.emit(
            "votes_revealed",
            {"votes": [row_to_camel(v) for v in votes], "average": average},
            room=meta["roomId"],
        )
        print(f"[socket] votos revelados en sesión {session_id}")

    @sio.on("save_result")
    async def save_result(sid, data):
        meta = get_meta(sid)
        if not meta or not meta["isModerator"]:
            await sio.emit("error", {"message": "Solo el moderador puede guardar"}, to=sid)
            return

        session_id = data.get("sessionId")
        result = data.get("result")
        dev_result = data.get("devResult")
        qa_result = data.get("qaResult")

        execute(
            "UPDATE sessions SET result = ?, dev_result = ?, qa_result = ? WHERE id = ?",
            (result, dev_result, qa_result, session_id),
        )

        await sio.emit(
            "result_saved", {"sessionId": session_id, "result": result},
            room=meta["roomId"],
        )
        await sio.emit("queue_updated", {"queue": get_queue(meta["roomId"])}, room=meta["roomId"])
        print(f"[socket] resultado guardado: {result} en sesión {session_id}")

    @sio.on("new_round")
    async def new_round(sid, data):
        meta = get_meta(sid)
        if not meta or not meta["isModerator"]:
            await sio.emit("error", {"message": "Solo el moderador puede iniciar ronda"}, to=sid)
            return

        room_id = data.get("roomId", "").upper()
        story_name = data.get("storyName", "").strip()
        jira_key = data.get("jiraKey")
        if jira_key:
            jira_key = jira_key.upper()

        session_id = generate_id()
        ts = now_ms()
        execute(
            "INSERT INTO sessions (id, room_id, story_name, jira_key, result, created_at, revealed_at) "
            "VALUES (?, ?, ?, ?, NULL, ?, NULL)",
            (session_id, room_id, story_name, jira_key, ts),
        )
        reset_votes(room_id)

        session = fetchone("SELECT * FROM sessions WHERE id = ?", (session_id,))
        await sio.emit("round_started", {"session": row_to_camel(session)}, room=room_id)
        print(f"[socket] nueva ronda '{story_name}' en sala {room_id}")

    @sio.on("add_to_queue")
    async def handle_add_to_queue(sid, data):
        meta = get_meta(sid)
        if not meta:
            await sio.emit(
                "error", {"message": "No estás en ninguna sala. Recargá la página."}, to=sid
            )
            return
        if not meta["isModerator"]:
            await sio.emit(
                "error", {"message": "Solo el moderador puede modificar la cola"}, to=sid
            )
            return

        room_id = data.get("roomId", "").upper()
        story_name = data.get("storyName", "").strip()
        jira_key = data.get("jiraKey")
        if jira_key:
            jira_key = jira_key.upper()

        add_to_queue(room_id, story_name, jira_key)
        await sio.emit("queue_updated", {"queue": get_queue(room_id)}, room=room_id)
        print(f"[socket] historia '{story_name}' agregada a cola de {room_id}")

    @sio.on("remove_from_queue")
    async def handle_remove_from_queue(sid, data):
        meta = get_meta(sid)
        if not meta or not meta["isModerator"]:
            await sio.emit(
                "error", {"message": "Solo el moderador puede modificar la cola"}, to=sid
            )
            return

        room_id = data.get("roomId", "").upper()
        story_id = data.get("storyId")
        remove_from_queue(room_id, story_id)
        await sio.emit("queue_updated", {"queue": get_queue(room_id)}, room=room_id)

    @sio.on("start_from_queue")
    async def handle_start_from_queue(sid, data):
        meta = get_meta(sid)
        if not meta or not meta["isModerator"]:
            await sio.emit("error", {"message": "Solo el moderador puede iniciar ronda"}, to=sid)
            return

        room_id = data.get("roomId", "").upper()
        story_id = data.get("storyId")
        story = get_from_queue(room_id, story_id)
        if not story:
            await sio.emit("error", {"message": "Historia no encontrada en la cola"}, to=sid)
            return

        session_id = generate_id()
        ts = now_ms()
        jira_key = story["jiraKey"].upper() if story["jiraKey"] else None
        execute(
            "INSERT INTO sessions "
            "(id, room_id, story_name, jira_key, story_queue_id, result, created_at, revealed_at) "
            "VALUES (?, ?, ?, ?, ?, NULL, ?, NULL)",
            (session_id, room_id, story["storyName"], jira_key, story_id, ts),
        )
        reset_votes(room_id)

        session = fetchone("SELECT * FROM sessions WHERE id = ?", (session_id,))
        await sio.emit("round_started", {"session": row_to_camel(session)}, room=room_id)
        print(f"[socket] ronda iniciada desde cola: '{story['storyName']}' en sala {room_id}")

    @sio.on("close_queue")
    async def handle_close_queue(sid, _data=None):
        meta = get_meta(sid)
        if not meta or not meta["isModerator"]:
            await sio.emit(
                "error", {"message": "Solo el moderador puede cerrar la sesión"}, to=sid
            )
            return
        clear_queue(meta["roomId"])
        await sio.emit("queue_updated", {"queue": []}, room=meta["roomId"])
        print(f"[socket] cola cerrada en sala {meta['roomId']}")
