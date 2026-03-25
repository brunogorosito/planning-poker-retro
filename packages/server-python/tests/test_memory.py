import memory as mem
from db import execute, now_ms


def _create_room(room_id: str = "SALA01") -> str:
    execute("INSERT INTO rooms (id, name, created_at) VALUES (?, ?, ?)", (room_id, "Test", now_ms()))
    return room_id


class TestParticipants:
    def test_add_and_get(self):
        mem.add_participant("s1", "SALA01", "Ana", "ana@t.com", False, "Dev")
        ps = mem.get_participants("SALA01")
        assert len(ps) == 1
        assert ps[0]["name"] == "Ana"
        assert ps[0]["role"] == "Dev"
        assert ps[0]["isModerator"] is False
        assert ps[0]["hasVoted"] is False

    def test_add_multiple(self):
        mem.add_participant("s1", "SALA01", "Ana", "a@t.com", False, "Dev")
        mem.add_participant("s2", "SALA01", "Bob", "b@t.com", True, "QA")
        assert len(mem.get_participants("SALA01")) == 2

    def test_moderator_flag(self):
        mem.add_participant("s1", "SALA01", "Mod", "m@t.com", True, "Dev")
        assert mem.get_participants("SALA01")[0]["isModerator"] is True

    def test_get_participants_empty_room(self):
        assert mem.get_participants("NOSALA") == []

    def test_remove_participant(self):
        mem.add_participant("s1", "SALA01", "Ana", "a@t.com", False, "Dev")
        meta = mem.remove_participant("s1")
        assert meta["name"] == "Ana"
        assert meta["roomId"] == "SALA01"
        assert mem.get_participants("SALA01") == []

    def test_remove_unknown_socket_returns_none(self):
        assert mem.remove_participant("nope") is None

    def test_reconnect_same_name_keeps_participant(self):
        """Si el mismo usuario reconecta (dos sockets), disconnect del primero no lo elimina."""
        mem.add_participant("s1", "SALA01", "Ana", "a@t.com", False, "Dev")
        mem.add_participant("s2", "SALA01", "Ana", "a@t.com", False, "Dev")
        mem.remove_participant("s1")
        assert len(mem.get_participants("SALA01")) == 1

    def test_mark_voted(self):
        mem.add_participant("s1", "SALA01", "Ana", "a@t.com", False, "Dev")
        mem.mark_voted("SALA01", "Ana")
        assert mem.get_participants("SALA01")[0]["hasVoted"] is True

    def test_reset_votes(self):
        mem.add_participant("s1", "SALA01", "Ana", "a@t.com", False, "Dev")
        mem.add_participant("s2", "SALA01", "Bob", "b@t.com", False, "QA")
        mem.mark_voted("SALA01", "Ana")
        mem.mark_voted("SALA01", "Bob")
        mem.reset_votes("SALA01")
        for p in mem.get_participants("SALA01"):
            assert p["hasVoted"] is False

    def test_get_meta(self):
        mem.add_participant("s1", "SALA01", "Ana", "a@t.com", True, "Dev")
        meta = mem.get_meta("s1")
        assert meta["roomId"] == "SALA01"
        assert meta["name"] == "Ana"
        assert meta["isModerator"] is True

    def test_get_meta_unknown_returns_none(self):
        assert mem.get_meta("nope") is None


class TestQueue:
    def test_empty_queue(self):
        _create_room()
        assert mem.get_queue("SALA01") == []

    def test_add_story(self):
        _create_room()
        mem.add_to_queue("SALA01", "Historia 1")
        queue = mem.get_queue("SALA01")
        assert len(queue) == 1
        assert queue[0]["storyName"] == "Historia 1"
        assert queue[0]["isVoted"] is False
        assert queue[0]["jiraKey"] is None

    def test_add_with_jira_key(self):
        _create_room()
        mem.add_to_queue("SALA01", "Login", jira_key="PROJ-1")
        assert mem.get_queue("SALA01")[0]["jiraKey"] == "PROJ-1"

    def test_queue_preserves_order(self):
        _create_room()
        mem.add_to_queue("SALA01", "A")
        mem.add_to_queue("SALA01", "B")
        mem.add_to_queue("SALA01", "C")
        names = [s["storyName"] for s in mem.get_queue("SALA01")]
        assert names == ["A", "B", "C"]

    def test_remove_story(self):
        _create_room()
        story = mem.add_to_queue("SALA01", "Historia 1")
        assert mem.remove_from_queue("SALA01", story["id"]) is True
        assert mem.get_queue("SALA01") == []

    def test_remove_nonexistent_returns_false(self):
        _create_room()
        assert mem.remove_from_queue("SALA01", "nope") is False

    def test_remove_wrong_room_returns_false(self):
        _create_room("SALA01")
        _create_room("SALA02")
        story = mem.add_to_queue("SALA01", "Historia 1")
        assert mem.remove_from_queue("SALA02", story["id"]) is False

    def test_get_from_queue(self):
        _create_room()
        story = mem.add_to_queue("SALA01", "Login", jira_key="PROJ-5")
        found = mem.get_from_queue("SALA01", story["id"])
        assert found["storyName"] == "Login"
        assert found["jiraKey"] == "PROJ-5"

    def test_get_from_queue_wrong_room_returns_none(self):
        _create_room("SALA01")
        _create_room("SALA02")
        story = mem.add_to_queue("SALA01", "Historia 1")
        assert mem.get_from_queue("SALA02", story["id"]) is None

    def test_clear_queue(self):
        _create_room()
        mem.add_to_queue("SALA01", "A")
        mem.add_to_queue("SALA01", "B")
        mem.clear_queue("SALA01")
        assert mem.get_queue("SALA01") == []
