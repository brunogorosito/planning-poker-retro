import re

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

RETRO_COLUMNS = [
    {"title": "Bien", "emoji": "✅"},
    {"title": "Mejorar", "emoji": "⚠️"},
    {"title": "Acciones", "emoji": "🎯"},
]


# --- Health ---

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# --- POST /api/rooms ---

def test_create_room_returns_201():
    r = client.post("/api/rooms", json={"name": "Sprint 1"})
    assert r.status_code == 201

def test_create_room_response_shape():
    r = client.post("/api/rooms", json={"name": "Sprint 1"}).json()
    assert r["name"] == "Sprint 1"
    assert re.match(r"^[A-Z0-9]{6}$", r["id"])
    assert isinstance(r["createdAt"], int)

def test_create_room_trims_name():
    r = client.post("/api/rooms", json={"name": "  Sprint  "}).json()
    assert r["name"] == "Sprint"

def test_create_room_empty_name_returns_400():
    assert client.post("/api/rooms", json={"name": "   "}).status_code == 400

def test_create_room_missing_name_returns_422():
    assert client.post("/api/rooms", json={}).status_code == 422


# --- GET /api/rooms/:id ---

def test_get_room():
    room_id = client.post("/api/rooms", json={"name": "S1"}).json()["id"]
    r = client.get(f"/api/rooms/{room_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["room"]["id"] == room_id
    assert data["room"]["name"] == "S1"
    assert data["currentSession"] is None
    assert data["currentVotes"] == []

def test_get_room_case_insensitive():
    room_id = client.post("/api/rooms", json={"name": "S1"}).json()["id"]
    assert client.get(f"/api/rooms/{room_id.lower()}").status_code == 200

def test_get_room_not_found():
    assert client.get("/api/rooms/XXXXXX").status_code == 404

def test_get_room_camel_case_response():
    room_id = client.post("/api/rooms", json={"name": "S1"}).json()["id"]
    room = client.get(f"/api/rooms/{room_id}").json()["room"]
    assert "createdAt" in room
    assert "created_at" not in room


# --- GET /api/rooms/:id/history ---

def test_get_history_empty():
    room_id = client.post("/api/rooms", json={"name": "S1"}).json()["id"]
    r = client.get(f"/api/rooms/{room_id}/history")
    assert r.status_code == 200
    assert r.json()["history"] == []

def test_get_history_not_found():
    assert client.get("/api/rooms/XXXXXX/history").status_code == 404


# --- POST /api/retros ---

def test_create_retro_returns_201():
    r = client.post("/api/retros", json={
        "title": "Sprint 5",
        "facilitatorEmail": "faci@test.com",
        "columns": RETRO_COLUMNS,
    })
    assert r.status_code == 201

def test_create_retro_returns_id():
    retro_id = client.post("/api/retros", json={
        "title": "Sprint 5",
        "facilitatorEmail": "faci@test.com",
        "columns": RETRO_COLUMNS,
    }).json()["id"]
    assert re.match(r"^[0-9a-f]{32}$", retro_id)

def test_create_retro_defaults():
    retro_id = client.post("/api/retros", json={
        "title": "R1",
        "facilitatorEmail": "f@t.com",
        "columns": [{"title": "Col"}],
    }).json()["id"]
    retro = client.get(f"/api/retros/{retro_id}").json()["retro"]
    assert retro["timerSeconds"] == 300
    assert retro["votesPerPerson"] == 5
    assert retro["phase"] == "waiting"

def test_create_retro_missing_fields_returns_error():
    r = client.post("/api/retros", json={"timerSeconds": 300, "columns": RETRO_COLUMNS})
    assert r.status_code in (400, 422)

def test_create_retro_empty_title_returns_400():
    r = client.post("/api/retros", json={
        "title": "   ",
        "facilitatorEmail": "f@t.com",
        "columns": RETRO_COLUMNS,
    })
    assert r.status_code == 400


# --- GET /api/retros/:id ---

def test_get_retro():
    retro_id = client.post("/api/retros", json={
        "title": "Sprint 5",
        "timerSeconds": 180,
        "votesPerPerson": 3,
        "facilitatorEmail": "faci@test.com",
        "columns": RETRO_COLUMNS,
    }).json()["id"]

    r = client.get(f"/api/retros/{retro_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["retro"]["id"] == retro_id
    assert data["retro"]["title"] == "Sprint 5"
    assert data["retro"]["phase"] == "waiting"
    assert data["retro"]["timerSeconds"] == 180
    assert data["retro"]["votesPerPerson"] == 3
    assert data["retro"]["facilitatorEmail"] == "faci@test.com"

def test_get_retro_columns_count():
    retro_id = client.post("/api/retros", json={
        "title": "R1",
        "facilitatorEmail": "f@t.com",
        "columns": RETRO_COLUMNS,
    }).json()["id"]
    columns = client.get(f"/api/retros/{retro_id}").json()["columns"]
    assert len(columns) == 3

def test_get_retro_columns_ordered():
    retro_id = client.post("/api/retros", json={
        "title": "R1",
        "facilitatorEmail": "f@t.com",
        "columns": [{"title": "A"}, {"title": "B"}, {"title": "C"}],
    }).json()["id"]
    columns = client.get(f"/api/retros/{retro_id}").json()["columns"]
    assert [c["title"] for c in columns] == ["A", "B", "C"]

def test_get_retro_not_found():
    assert client.get("/api/retros/nonexistent").status_code == 404

def test_get_retro_camel_case_response():
    retro_id = client.post("/api/retros", json={
        "title": "R1",
        "facilitatorEmail": "f@t.com",
        "columns": [{"title": "Col"}],
    }).json()["id"]
    retro = client.get(f"/api/retros/{retro_id}").json()["retro"]
    assert "facilitatorEmail" in retro
    assert "facilitator_email" not in retro
    assert "votesPerPerson" in retro


# --- GET /api/jira/issue/:key ---

def test_jira_not_configured_returns_503():
    assert client.get("/api/jira/issue/PROJ-1").status_code == 503

def test_jira_invalid_key_returns_400():
    assert client.get("/api/jira/issue/not-a-key").status_code == 400

def test_jira_valid_key_not_configured_returns_503():
    # proj-1 se normaliza a PROJ-1 que es válido → pasa la validación, falla por config
    assert client.get("/api/jira/issue/proj-1").status_code == 503
