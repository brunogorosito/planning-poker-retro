import asyncio

import socketio

from db import fetchone, fetchall, execute, generate_id, row_to_camel, now_ms
from retro_memory import (
    add_retro_participant,
    get_retro_participants,
    update_retro_card_count,
    get_retro_meta,
    remove_retro_participant,
    retro_timers,
)


def _item_to_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "retroId": row["retro_id"],
        "columnId": row["column_id"],
        "content": row["content"],
        "votes": row["votes"],
        "createdAt": row["created_at"],
    }


def _count_votes_used(retro_id: str, email: str) -> int:
    items = fetchall("SELECT id FROM retro_items WHERE retro_id = ?", (retro_id,))
    total = 0
    for item in items:
        total += len(
            fetchall(
                "SELECT id FROM retro_votes WHERE item_id = ? AND voter_email = ?",
                (item["id"], email),
            )
        )
    return total


def _build_retro_state(retro_id: str, email: str) -> dict | None:
    retro = fetchone("SELECT * FROM retros WHERE id = ?", (retro_id,))
    if not retro:
        return None

    columns = fetchall(
        "SELECT * FROM retro_columns WHERE retro_id = ? ORDER BY position ASC", (retro_id,)
    )
    participants = get_retro_participants(retro_id)

    all_rows = fetchall(
        "SELECT * FROM retro_items WHERE retro_id = ? ORDER BY created_at ASC", (retro_id,)
    )

    is_post_reveal = retro["phase"] in ("revealed", "voting", "closed")

    my_cards = [_item_to_dict(r) for r in all_rows if r["author_email"] == email]
    all_cards = [_item_to_dict(r) for r in all_rows] if is_post_reveal else []

    votes_used = _count_votes_used(retro_id, email) if is_post_reveal else 0
    my_votes_left = max(0, retro["votes_per_person"] - votes_used)

    return {
        "retro": row_to_camel(retro),
        "columns": [row_to_camel(c) for c in columns],
        "participants": participants,
        "myCards": my_cards,
        "allCards": all_cards,
        "myVotesLeft": my_votes_left,
    }


async def _reveal_retro(sio: socketio.AsyncServer, retro_id: str) -> None:
    retro_timers.pop(retro_id, None)
    execute(
        "UPDATE retros SET phase = 'revealed', writing_ends_at = NULL WHERE id = ?",
        (retro_id,),
    )
    all_rows = fetchall(
        "SELECT * FROM retro_items WHERE retro_id = ? ORDER BY created_at ASC", (retro_id,)
    )
    await sio.emit("retro_revealed", {"cards": [_item_to_dict(r) for r in all_rows]}, room=retro_id)
    await sio.emit("retro_phase_changed", {"phase": "revealed"}, room=retro_id)
    print(f"[retro] tarjetas reveladas en {retro_id}")


async def handle_retro_disconnect(sio: socketio.AsyncServer, sid: str) -> None:
    meta = remove_retro_participant(sid)
    if meta:
        await sio.emit(
            "retro_participant_left",
            {"name": meta["name"], "email": meta["email"]},
            room=meta["retroId"],
        )


def register_retro_handlers(sio: socketio.AsyncServer) -> None:

    @sio.on("join_retro")
    async def join_retro(sid, data):
        retro_id = data.get("retroId")
        name = data.get("name", "")
        email = data.get("email", "")

        retro = fetchone("SELECT * FROM retros WHERE id = ?", (retro_id,))
        if not retro:
            await sio.emit("error", {"message": "Retrospectiva no encontrada"}, to=sid)
            return

        my_item_count = len([
            r for r in fetchall("SELECT * FROM retro_items WHERE retro_id = ?", (retro_id,))
            if r["author_email"] == email
        ])

        is_facilitator = retro["facilitator_email"] == email
        add_retro_participant(sid, retro_id, email, name, is_facilitator, my_item_count)
        await sio.enter_room(sid, retro_id)

        state = _build_retro_state(retro_id, email)
        if state:
            await sio.emit("retro_state", state, to=sid)

        await sio.emit(
            "retro_participant_joined", {"name": name, "email": email},
            room=retro_id, skip_sid=sid,
        )
        print(f"[retro] {name} ({email}) se unió a retro {retro_id}")

    @sio.on("add_card")
    async def add_card(sid, data):
        meta = get_retro_meta(sid)
        if not meta:
            return

        retro = fetchone("SELECT * FROM retros WHERE id = ?", (meta["retroId"],))
        if not retro or retro["phase"] != "writing":
            await sio.emit(
                "error", {"message": "No se puede agregar tarjetas en esta fase"}, to=sid
            )
            return

        column_id = data.get("columnId")
        content = data.get("content", "").strip()
        if not content:
            return

        item_id = generate_id()
        ts = now_ms()
        execute(
            "INSERT INTO retro_items (id, retro_id, column_id, author_email, content, votes, created_at) "
            "VALUES (?, ?, ?, ?, ?, 0, ?)",
            (item_id, meta["retroId"], column_id, meta["email"], content, ts),
        )

        my_count = len([
            r for r in fetchall("SELECT * FROM retro_items WHERE retro_id = ?", (meta["retroId"],))
            if r["author_email"] == meta["email"]
        ])
        update_retro_card_count(meta["retroId"], meta["email"], my_count)

        item = fetchone("SELECT * FROM retro_items WHERE id = ?", (item_id,))
        await sio.emit("retro_card_added", {"card": _item_to_dict(item)}, to=sid)

        counts = [
            {"email": p["email"], "count": p["cardCount"]}
            for p in get_retro_participants(meta["retroId"])
        ]
        await sio.emit("retro_card_counts", {"counts": counts}, room=meta["retroId"])

    @sio.on("edit_card")
    async def edit_card(sid, data):
        meta = get_retro_meta(sid)
        if not meta:
            return

        retro = fetchone("SELECT * FROM retros WHERE id = ?", (meta["retroId"],))
        if not retro or retro["phase"] != "writing":
            return

        card_id = data.get("cardId")
        content = data.get("content", "").strip()

        item = fetchone("SELECT * FROM retro_items WHERE id = ?", (card_id,))
        if not item or item["author_email"] != meta["email"]:
            return

        execute("UPDATE retro_items SET content = ? WHERE id = ?", (content, card_id))
        updated = fetchone("SELECT * FROM retro_items WHERE id = ?", (card_id,))
        await sio.emit("retro_card_updated", {"card": _item_to_dict(updated)}, to=sid)

    @sio.on("delete_card")
    async def delete_card(sid, data):
        meta = get_retro_meta(sid)
        if not meta:
            return

        retro = fetchone("SELECT * FROM retros WHERE id = ?", (meta["retroId"],))
        if not retro or retro["phase"] != "writing":
            return

        card_id = data.get("cardId")
        item = fetchone("SELECT * FROM retro_items WHERE id = ?", (card_id,))
        if not item or item["author_email"] != meta["email"]:
            return

        execute("DELETE FROM retro_items WHERE id = ?", (card_id,))

        my_count = len([
            r for r in fetchall("SELECT * FROM retro_items WHERE retro_id = ?", (meta["retroId"],))
            if r["author_email"] == meta["email"]
        ])
        update_retro_card_count(meta["retroId"], meta["email"], my_count)

        await sio.emit("retro_card_deleted", {"cardId": card_id}, to=sid)

        counts = [
            {"email": p["email"], "count": p["cardCount"]}
            for p in get_retro_participants(meta["retroId"])
        ]
        await sio.emit("retro_card_counts", {"counts": counts}, room=meta["retroId"])

    @sio.on("vote_card")
    async def vote_card(sid, data):
        meta = get_retro_meta(sid)
        if not meta:
            return

        retro = fetchone("SELECT * FROM retros WHERE id = ?", (meta["retroId"],))
        if not retro or retro["phase"] != "voting":
            await sio.emit("error", {"message": "La votación no está activa"}, to=sid)
            return

        used = _count_votes_used(meta["retroId"], meta["email"])
        if used >= retro["votes_per_person"]:
            await sio.emit("error", {"message": "No tenés votos disponibles"}, to=sid)
            return

        card_id = data.get("cardId")
        item = fetchone("SELECT * FROM retro_items WHERE id = ?", (card_id,))
        if not item or item["retro_id"] != meta["retroId"]:
            return

        execute(
            "INSERT INTO retro_votes (id, item_id, voter_email) VALUES (?, ?, ?)",
            (generate_id(), card_id, meta["email"]),
        )
        execute("UPDATE retro_items SET votes = votes + 1 WHERE id = ?", (card_id,))

        updated_item = fetchone("SELECT * FROM retro_items WHERE id = ?", (card_id,))
        await sio.emit(
            "retro_card_voted",
            {
                "cardId": card_id,
                "votes": updated_item["votes"],
                "voterEmail": meta["email"],
                "newVotesLeft": retro["votes_per_person"] - used - 1,
            },
            room=meta["retroId"],
        )

    @sio.on("start_timer")
    async def start_timer(sid, data):
        meta = get_retro_meta(sid)
        if not meta or not meta["isFacilitator"]:
            return

        retro_id = data.get("retroId")
        retro = fetchone("SELECT * FROM retros WHERE id = ?", (retro_id,))
        if not retro or retro["phase"] != "waiting":
            return

        writing_ends_at = now_ms() + retro["timer_seconds"] * 1000
        execute(
            "UPDATE retros SET phase = 'writing', writing_ends_at = ? WHERE id = ?",
            (writing_ends_at, retro_id),
        )
        await sio.emit(
            "retro_phase_changed",
            {"phase": "writing", "writingEndsAt": writing_ends_at},
            room=retro_id,
        )

        async def _timer_task():
            await asyncio.sleep(retro["timer_seconds"])
            await _reveal_retro(sio, retro_id)

        task = asyncio.create_task(_timer_task())
        retro_timers[retro_id] = task
        print(f"[retro] timer iniciado en {retro_id} ({retro['timer_seconds']}s)")

    @sio.on("reveal_now")
    async def reveal_now(sid, data):
        meta = get_retro_meta(sid)
        if not meta or not meta["isFacilitator"]:
            return

        retro_id = data.get("retroId")
        task = retro_timers.pop(retro_id, None)
        if task:
            task.cancel()

        await _reveal_retro(sio, retro_id)

    @sio.on("start_voting")
    async def start_voting(sid, data):
        meta = get_retro_meta(sid)
        if not meta or not meta["isFacilitator"]:
            return

        retro_id = data.get("retroId")
        retro = fetchone("SELECT * FROM retros WHERE id = ?", (retro_id,))
        if not retro or retro["phase"] != "revealed":
            return

        execute("UPDATE retros SET phase = 'voting' WHERE id = ?", (retro_id,))
        await sio.emit("retro_phase_changed", {"phase": "voting"}, room=retro_id)
        print(f"[retro] votación iniciada en {retro_id}")

    @sio.on("close_retro")
    async def close_retro(sid, data):
        meta = get_retro_meta(sid)
        if not meta or not meta["isFacilitator"]:
            return

        retro_id = data.get("retroId")
        execute("UPDATE retros SET phase = 'closed' WHERE id = ?", (retro_id,))
        await sio.emit("retro_phase_changed", {"phase": "closed"}, room=retro_id)
        print(f"[retro] retro cerrada {retro_id}")
