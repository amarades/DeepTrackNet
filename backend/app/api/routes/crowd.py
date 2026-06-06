"""
Crowd Analytics REST API routes.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Query, Path, HTTPException
from app.services.simulation.mock_data_generator import (
    generate_frame_data,
    generate_historical_data,
    CAMERAS,
    SCENE_PRESETS,
)

router = APIRouter()
_state: dict = {}  # per-camera state for mock generator


@router.get("/live/{camera_id}")
async def get_live_stats(camera_id: str = Path(..., description="Camera ID")):
    """Get current crowd statistics for a specific camera."""
    if camera_id not in CAMERAS:
        raise HTTPException(404, f"Camera '{camera_id}' not found. Available: {CAMERAS}")

    frame = generate_frame_data(camera_id, _state)
    return {
        "camera_id": camera_id,
        "camera_name": SCENE_PRESETS[camera_id]["name"],
        "timestamp": frame["timestamp"],
        "people_count": frame["people_count"],
        "density_score": frame["density_score"],
        "risk_level": frame["risk_level"],
        "anomaly_score": frame["anomaly_score"],
        "surge_active": frame["surge_active"],
        "avg_speed": frame["avg_speed"],
        "flow_direction": frame["flow_direction"],
        "zone_data": frame["zone_data"],
        "tracked_ids": frame["tracked_ids"],
    }


@router.get("/live")
async def get_all_cameras_live():
    """Get live stats for all cameras — useful for overview dashboard."""
    results = {}
    for cam_id in CAMERAS:
        frame = generate_frame_data(cam_id, _state)
        results[cam_id] = {
            "camera_name": SCENE_PRESETS[cam_id]["name"],
            "people_count": frame["people_count"],
            "density_score": frame["density_score"],
            "risk_level": frame["risk_level"],
            "anomaly_score": frame["anomaly_score"],
            "surge_active": frame["surge_active"],
        }
    return {"cameras": results, "timestamp": datetime.utcnow().isoformat()}


@router.get("/history/{camera_id}")
async def get_history(
    camera_id: str = Path(...),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of history (max 7 days)"),
    interval: int = Query(default=5, ge=1, le=60, description="Interval in minutes"),
):
    """Get historical crowd data for charts and analytics."""
    if camera_id not in CAMERAS:
        raise HTTPException(404, f"Camera '{camera_id}' not found")

    data = generate_historical_data(camera_id, hours=hours, interval_minutes=interval)
    return {
        "camera_id": camera_id,
        "camera_name": SCENE_PRESETS[camera_id]["name"],
        "hours": hours,
        "interval_minutes": interval,
        "data_points": len(data),
        "data": data,
        "summary": {
            "avg_count": round(sum(d["people_count"] for d in data) / len(data), 1) if data else 0,
            "peak_count": max((d["people_count"] for d in data), default=0),
            "avg_density": round(sum(d["density_score"] for d in data) / len(data), 3) if data else 0.0,
        },
    }


@router.get("/summary")
async def get_platform_summary():
    """Get aggregated platform-wide statistics."""
    all_frames = {cam: generate_frame_data(cam, _state) for cam in CAMERAS}
    total_count = sum(f["people_count"] for f in all_frames.values())
    avg_density = sum(f["density_score"] for f in all_frames.values()) / len(CAMERAS)
    risk_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for f in all_frames.values():
        risk_counts[f["risk_level"]] = risk_counts.get(f["risk_level"], 0) + 1

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "total_cameras": len(CAMERAS),
        "total_people_detected": total_count,
        "avg_density": round(avg_density, 3),
        "risk_distribution": risk_counts,
        "active_surges": sum(1 for f in all_frames.values() if f["surge_active"]),
        "cameras": [
            {
                "id": cam,
                "name": SCENE_PRESETS[cam]["name"],
                "count": all_frames[cam]["people_count"],
                "risk": all_frames[cam]["risk_level"],
            }
            for cam in CAMERAS
        ],
    }
