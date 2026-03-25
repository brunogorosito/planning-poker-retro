import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn

from db import init_db
from memory import remove_participant
from retro_handlers import handle_retro_disconnect, register_retro_handlers
from routes.jira import router as jira_router
from routes.retros import router as retros_router
from routes.rooms import router as rooms_router
from socket_handlers import register_handlers

PORT = int(os.environ.get("PORT", 3000))
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "http://localhost:5173")

init_db()

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms_router, prefix="/api/rooms")
app.include_router(retros_router, prefix="/api/retros")
app.include_router(jira_router, prefix="/api/jira")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Archivos estáticos del cliente — en producción se copian a public/
client_dist = Path(__file__).parent / "public"


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    if not client_dist.is_dir():
        return {"error": "No hay build del cliente. Ejecutá pnpm build primero."}
    target = client_dist / full_path
    if target.is_file():
        return FileResponse(target)
    return FileResponse(client_dist / "index.html")


# Handlers de Socket.io
register_handlers(sio)
register_retro_handlers(sio)


@sio.event
async def disconnect(sid):
    meta = remove_participant(sid)
    if meta:
        await sio.emit("participant_left", {"name": meta["name"]}, room=meta["roomId"])
        print(f"[socket] {meta['name']} salió de {meta['roomId']}")
    await handle_retro_disconnect(sio, sid)


# ASGI app combinada: socket.io + FastAPI
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    uvicorn.run("main:socket_app", host="0.0.0.0", port=PORT)
