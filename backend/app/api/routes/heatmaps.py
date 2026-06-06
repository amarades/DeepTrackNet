"""Heatmap API routes."""
from fastapi import APIRouter, Path
from app.services.simulation.mock_data_generator import generate_frame_data, CAMERAS, SCENE_PRESETS, generate_historical_data
import random

router = APIRouter()
_state: dict = {}


@router.get("/{camera_id}/current")
async def get_current_heatmap(camera_id: str = Path(...)):
    """Get current heatmap data matrix for a camera."""
    if camera_id not in CAMERAS:
        from fastapi import HTTPException
        raise HTTPException(404, "Camera not found")
    frame = generate_frame_data(camera_id, _state)
    return {
        "camera_id": camera_id,
        "timestamp": frame["timestamp"],
        "heatmap_matrix": frame["heatmap_data"],  # 3x4 grid of density values
        "zone_data": frame["zone_data"],
        "color_scale": {"min": 0.0, "max": 1.0, "green": 0.55, "yellow": 0.75, "red": 1.0},
    }


@router.get("/{camera_id}/history")
async def get_heatmap_history(camera_id: str = Path(...), snapshots: int = 6):
    """Get historical heatmap snapshots for comparison."""
    if camera_id not in CAMERAS:
        from fastapi import HTTPException
        raise HTTPException(404, "Camera not found")

    history = []
    for i in range(snapshots):
        frame = generate_frame_data(camera_id, {})
        history.append({
            "snapshot_index": i,
            "timestamp": frame["timestamp"],
            "heatmap_matrix": frame["heatmap_data"],
            "people_count": frame["people_count"],
            "density_score": frame["density_score"],
        })
    return {"camera_id": camera_id, "snapshots": history}
