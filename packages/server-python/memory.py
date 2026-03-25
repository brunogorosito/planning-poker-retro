from db import fetchall, fetchone, execute, generate_id, now_ms

# socket_id → metadata del socket
_socket_map: dict[str, dict] = {}

# room_id → { name → participante }
_room_participants: dict[str, dict[str, dict]] = {}


def add_participant(
    socket_id: str,
    room_id: str,
    name: str,
    email: str,
    is_moderator: bool,
    role: str,
) -> None:
    _socket_map[socket_id] = {
        "roomId": room_id,
        "name": name,
        "email": email,
        "isModerator": is_moderator,
        "role": role,
    }
    if room_id not in _room_participants:
        _room_participants[room_id] = {}
    _room_participants[room_id][name] = {
        "name": name,
        "isModerator": is_moderator,
        "hasVoted": False,
        "role": role,
    }


def remove_participant(socket_id: str) -> dict | None:
    meta = _socket_map.pop(socket_id, None)
    if not meta:
        return None
    # Solo eliminar si no hay otro socket con el mismo nombre en la sala
    other = any(
        m["roomId"] == meta["roomId"] and m["name"] == meta["name"]
        for m in _socket_map.values()
    )
    if not other:
        _room_participants.get(meta["roomId"], {}).pop(meta["name"], None)
    return meta


def get_participants(room_id: str) -> list[dict]:
    return list(_room_participants.get(room_id, {}).values())


def mark_voted(room_id: str, name: str) -> None:
    p = _room_participants.get(room_id, {}).get(name)
    if p:
        p["hasVoted"] = True


def reset_votes(room_id: str) -> None:
    for p in _room_participants.get(room_id, {}).values():
        p["hasVoted"] = False


def get_meta(socket_id: str) -> dict | None:
    return _socket_map.get(socket_id)


# --- Gestión de cola (persistida en SQLite) ---

def get_queue(room_id: str) -> list[dict]:
    rows = fetchall(
        "SELECT * FROM story_queue WHERE room_id = ? ORDER BY position ASC",
        (room_id,),
    )
    voted_sessions = fetchall(
        "SELECT story_queue_id FROM sessions "
        "WHERE room_id = ? AND result IS NOT NULL AND story_queue_id IS NOT NULL",
        (room_id,),
    )
    voted_ids = {s["story_queue_id"] for s in voted_sessions}
    return [
        {
            "id": r["id"],
            "storyName": r["story_name"],
            "jiraKey": r["jira_key"],
            "isVoted": r["id"] in voted_ids,
        }
        for r in rows
    ]


def add_to_queue(room_id: str, story_name: str, jira_key: str | None = None) -> dict:
    rows = fetchall(
        "SELECT position FROM story_queue WHERE room_id = ? ORDER BY position ASC",
        (room_id,),
    )
    max_pos = max((r["position"] for r in rows), default=0)
    story_id = generate_id()
    execute(
        "INSERT INTO story_queue (id, room_id, story_name, jira_key, position, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (story_id, room_id, story_name, jira_key, max_pos + 1, now_ms()),
    )
    return {"id": story_id, "storyName": story_name, "jiraKey": jira_key}


def remove_from_queue(room_id: str, story_id: str) -> bool:
    row = fetchone("SELECT * FROM story_queue WHERE id = ?", (story_id,))
    if not row or row["room_id"] != room_id:
        return False
    execute("DELETE FROM story_queue WHERE id = ?", (story_id,))
    return True


def get_from_queue(room_id: str, story_id: str) -> dict | None:
    row = fetchone("SELECT * FROM story_queue WHERE id = ?", (story_id,))
    if not row or row["room_id"] != room_id:
        return None
    return {"id": row["id"], "storyName": row["story_name"], "jiraKey": row["jira_key"]}


def clear_queue(room_id: str) -> None:
    execute("DELETE FROM story_queue WHERE room_id = ?", (room_id,))
