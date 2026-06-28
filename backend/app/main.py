import os
from pathlib import Path

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.websocket import handle_socket
from .ml.checkpoints import load_model_manifest

app = FastAPI(title="Neural Network Playground")
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
APP_BASE_PATH = os.getenv("APP_BASE_PATH", "").rstrip("/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/model/manifest")
def model_manifest() -> dict:
    return load_model_manifest() or {}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await handle_socket(websocket)


if APP_BASE_PATH:
    app.add_api_route(f"{APP_BASE_PATH}/api/model/manifest", model_manifest, methods=["GET"])
    app.add_api_websocket_route(f"{APP_BASE_PATH}/ws", websocket_endpoint)

if FRONTEND_DIST.exists():
    if APP_BASE_PATH:
        app.mount(
            APP_BASE_PATH,
            StaticFiles(directory=FRONTEND_DIST, html=True),
            name="frontend",
        )
    else:
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
