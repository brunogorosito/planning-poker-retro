import os
import sys
import tempfile

# Agregar el directorio del servidor al path antes de cualquier import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configurar una DB de prueba antes de que db.py se importe
_db_fd, _db_path = tempfile.mkstemp(suffix=".db", prefix="scrum_poker_test_")
os.close(_db_fd)
os.environ["DB_PATH"] = _db_path

import sqlite3
import pytest

import db as db_module
import memory as memory_module
import retro_memory as retro_memory_module


@pytest.fixture(autouse=True)
def fresh_state():
    """Cada test arranca con una DB limpia y estado en memoria limpio."""
    conn = sqlite3.connect(":memory:", isolation_level=None, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")

    db_module._conn = conn
    db_module.init_db()

    memory_module._socket_map.clear()
    memory_module._room_participants.clear()
    retro_memory_module._retro_socket_map.clear()
    retro_memory_module._retro_participants.clear()

    yield

    conn.close()
