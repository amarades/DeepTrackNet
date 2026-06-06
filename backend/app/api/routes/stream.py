"""
WebSocket Live Stream Endpoint — streams real-time crowd data at 1fps.
Supports multiple concurrent clients per camera via connection manager.
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.simulation.mock_data_generator import generate_frame_data, generate_recommendations

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections grouped by camera_id."""

    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}
        self._camera_states: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, camera_id: str):
        await websocket.accept()
        if camera_id not in self.active:
            self.active[camera_id] = []
        self.active[camera_id].append(websocket)
        print(f"[WS] Client connected to {camera_id} ({len(self.active[camera_id])} total)")

    def disconnect(self, websocket: WebSocket, camera_id: str):
        if camera_id in self.active:
            self.active[camera_id] = [
                ws for ws in self.active[camera_id] if ws != websocket
            ]
        print(f"[WS] Client disconnected from {camera_id}")

    async def broadcast(self, camera_id: str, data: dict):
        if camera_id not in self.active:
            return
        dead = []
        for ws in self.active[camera_id]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active[camera_id].remove(ws)


manager = ConnectionManager()
_camera_state_store: Dict[str, dict] = {}


@router.websocket("/ws/{camera_id}")
async def websocket_stream(
    websocket: WebSocket,
    camera_id: str,
    fps: int = Query(default=1, ge=1, le=10),
):
    """
    WebSocket endpoint for live crowd monitoring stream.

    Connect: ws://localhost:8000/api/v1/stream/ws/{camera_id}
    Sends JSON frame data at the requested FPS rate.

    Message format:
    {
        "type": "frame",
        "data": { ...CrowdFrameData... },
        "recommendations": [...],
        "server_time": "ISO8601"
    }
    """
    await manager.connect(websocket, camera_id)
    interval = 1.0 / fps

    try:
        while True:
            frame_data = generate_frame_data(camera_id, _camera_state_store)
            recommendations = generate_recommendations(
                frame_data["risk_level"],
                frame_data["density_score"],
                frame_data["people_count"],
            )

            payload = {
                "type": "frame",
                "data": frame_data,
                "recommendations": recommendations,
                "server_time": datetime.utcnow().isoformat(),
            }

            await websocket.send_json(payload)
            await asyncio.sleep(interval)

    except WebSocketDisconnect:
        manager.disconnect(websocket, camera_id)
    except Exception as e:
        print(f"[WS] Error on {camera_id}: {e}")
        manager.disconnect(websocket, camera_id)


@router.get("/cameras")
async def list_cameras():
    """List available camera feeds."""
    from app.services.simulation.mock_data_generator import CAMERAS, SCENE_PRESETS
    return {
        "cameras": [
            {
                "id": cam_id,
                "name": SCENE_PRESETS[cam_id]["name"],
                "stream_url": f"ws://localhost:8000/api/v1/stream/ws/{cam_id}",
                "status": "active",
            }
            for cam_id in CAMERAS
        ]
    }
