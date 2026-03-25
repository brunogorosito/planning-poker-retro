import asyncio

# socket_id → metadata del socket retro
_retro_socket_map: dict[str, dict] = {}

# retro_id → { email → participante }
_retro_participants: dict[str, dict[str, dict]] = {}

# retro_id → asyncio.Task del timer
retro_timers: dict[str, asyncio.Task] = {}


def add_retro_participant(
    socket_id: str,
    retro_id: str,
    email: str,
    name: str,
    is_facilitator: bool,
    card_count: int,
) -> None:
    _retro_socket_map[socket_id] = {
        "retroId": retro_id,
        "email": email,
        "name": name,
        "isFacilitator": is_facilitator,
    }
    if retro_id not in _retro_participants:
        _retro_participants[retro_id] = {}
    _retro_participants[retro_id][email] = {
        "email": email,
        "name": name,
        "isFacilitator": is_facilitator,
        "cardCount": card_count,
    }


def remove_retro_participant(socket_id: str) -> dict | None:
    meta = _retro_socket_map.pop(socket_id, None)
    if not meta:
        return None
    other = any(
        m["retroId"] == meta["retroId"] and m["email"] == meta["email"]
        for m in _retro_socket_map.values()
    )
    if not other:
        _retro_participants.get(meta["retroId"], {}).pop(meta["email"], None)
    return meta


def get_retro_participants(retro_id: str) -> list[dict]:
    return list(_retro_participants.get(retro_id, {}).values())


def update_retro_card_count(retro_id: str, email: str, count: int) -> None:
    p = _retro_participants.get(retro_id, {}).get(email)
    if p:
        p["cardCount"] = count


def get_retro_meta(socket_id: str) -> dict | None:
    return _retro_socket_map.get(socket_id)
