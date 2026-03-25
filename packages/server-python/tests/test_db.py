import re
import time

from db import calc_average, generate_id, generate_room_code, now_ms, row_to_camel


class TestCalcAverage:
    def test_empty_list_returns_none(self):
        assert calc_average([]) is None

    def test_all_question_marks_returns_none(self):
        assert calc_average(["?", "?", "?"]) is None

    def test_ignores_question_marks(self):
        assert calc_average(["3", "?", "5"]) == 4

    def test_calculates_correctly(self):
        assert calc_average(["2", "4"]) == 3
        assert calc_average(["1", "2", "3"]) == 2
        assert calc_average(["5", "8", "13"]) == 8.7

    def test_rounds_to_one_decimal(self):
        assert calc_average(["1", "2"]) == 1.5

    def test_single_numeric_value(self):
        assert calc_average(["8"]) == 8
        assert calc_average(["21"]) == 21

    def test_full_fibonacci_deck(self):
        assert calc_average(["1", "2", "3", "5", "8", "13", "21"]) == 7.6

    def test_mixed_question_marks_and_numbers(self):
        assert calc_average(["?", "5", "?", "5"]) == 5


class TestGenerateRoomCode:
    def test_length_is_six(self):
        assert len(generate_room_code()) == 6

    def test_only_uppercase_and_digits(self):
        assert re.match(r"^[A-Z0-9]{6}$", generate_room_code())

    def test_generates_distinct_codes(self):
        codes = {generate_room_code() for _ in range(20)}
        assert len(codes) > 1


class TestGenerateId:
    def test_length_is_32(self):
        assert len(generate_id()) == 32

    def test_is_hexadecimal(self):
        assert re.match(r"^[0-9a-f]{32}$", generate_id())

    def test_generates_unique_ids(self):
        ids = {generate_id() for _ in range(20)}
        assert len(ids) == 20


class TestRowToCamel:
    def test_converts_snake_case_keys(self):
        result = row_to_camel({"created_at": 123, "room_id": "ABC", "story_name": "login"})
        assert result == {"createdAt": 123, "roomId": "ABC", "storyName": "login"}

    def test_preserves_single_word_keys(self):
        assert row_to_camel({"id": "1", "name": "test"}) == {"id": "1", "name": "test"}

    def test_preserves_none_values(self):
        result = row_to_camel({"revealed_at": None, "jira_key": None})
        assert result["revealedAt"] is None
        assert result["jiraKey"] is None

    def test_multiple_underscores(self):
        result = row_to_camel({"dev_result": "3", "qa_result": "5", "story_queue_id": "abc"})
        assert "devResult" in result
        assert "qaResult" in result
        assert "storyQueueId" in result

    def test_retro_columns(self):
        result = row_to_camel({"facilitator_email": "a@b.com", "votes_per_person": 5, "writing_ends_at": None})
        assert result["facilitatorEmail"] == "a@b.com"
        assert result["votesPerPerson"] == 5
        assert result["writingEndsAt"] is None


class TestNowMs:
    def test_returns_integer(self):
        assert isinstance(now_ms(), int)

    def test_is_recent_timestamp(self):
        ts = now_ms()
        now = int(time.time() * 1000)
        assert abs(ts - now) < 200
