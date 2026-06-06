"""
Minimal FastAPI app that works without PostgreSQL/Redis for quick local testing.
The full app (app/main.py) requires DB connections.
This standalone version uses in-memory state only.
"""
import asyncio
import math
import random
import json
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Dict, List, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

# ── Import simulation engine ───────────────────────────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.simulation.mock_data_generator import (
    generate_frame_data,
    generate_historical_data,
    generate_forecast,
    generate_alert_history,
    generate_recommendations,
    CAMERAS,
    SCENE_PRESETS,
)
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token

app = FastAPI(
    title="DeepTrackNet",
    description="Crowd Monitoring & Predictive Safety Analytics Platform",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory state ────────────────────────────────────────────────────────────
_cam_state: Dict = {}
_alerts_cache: List = []

# ── Auth ───────────────────────────────────────────────────────────────────────
DEMO_USERS = {
    "admin@deeptracknet.ai":    {"full_name": "System Administrator", "role": "admin",            "pw": "Admin@123"},
    "security@deeptracknet.ai": {"full_name": "Security Officer",     "role": "security_officer", "pw": "Security@123"},
    "manager@deeptracknet.ai":  {"full_name": "Event Manager",        "role": "event_manager",    "pw": "Manager@123"},
    "viewer@deeptracknet.ai":   {"full_name": "Viewer Account",       "role": "viewer",           "pw": "Viewer@123"},
}
_hashed = {email: {**u, "hash": get_password_hash(u["pw"])} for email, u in DEMO_USERS.items()}


@app.get("/")
def root():
    return {"service": "DeepTrackNet", "version": "1.0.0", "simulation_mode": True, "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ── Auth ───────────────────────────────────────────────────────────────────────
@app.post("/api/v1/auth/login")
def login(body: dict):
    email = body.get("email", "")
    password = body.get("password", "")
    user = _hashed.get(email)
    if not user or not verify_password(password, user["hash"]):
        from fastapi import HTTPException
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token({"sub": email, "role": user["role"]})
    refresh = create_refresh_token({"sub": email})
    return {
        "access_token": token, "refresh_token": refresh, "token_type": "bearer",
        "user": {"email": email, "full_name": user["full_name"], "role": user["role"]},
    }

@app.get("/api/v1/auth/me")
def me():
    return {"demo": True}

# ── Crowd ──────────────────────────────────────────────────────────────────────
@app.get("/api/v1/crowd/live/{camera_id}")
def live_stats(camera_id: str):
    if camera_id not in CAMERAS:
        from fastapi import HTTPException
        raise HTTPException(404, "Camera not found")
    return generate_frame_data(camera_id, _cam_state)

@app.get("/api/v1/crowd/live")
def all_live():
    results = {}
    for c in CAMERAS:
        f = generate_frame_data(c, _cam_state)
        results[c] = {"camera_name": SCENE_PRESETS[c]["name"], **{k: f[k] for k in ["people_count","density_score","risk_level","anomaly_score","surge_active"]}}
    return {"cameras": results, "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/v1/crowd/history/{camera_id}")
def history(camera_id: str, hours: int = 24, interval: int = 5):
    data = generate_historical_data(camera_id, hours, interval)
    return {"camera_id": camera_id, "data": data, "summary": {
        "avg_count": round(sum(d["people_count"] for d in data)/len(data),1) if data else 0,
        "peak_count": max((d["people_count"] for d in data), default=0),
        "avg_density": round(sum(d["density_score"] for d in data)/len(data),3) if data else 0,
    }}

@app.get("/api/v1/crowd/summary")
def summary():
    all_frames = {c: generate_frame_data(c, _cam_state) for c in CAMERAS}
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "total_cameras": len(CAMERAS),
        "total_people_detected": sum(f["people_count"] for f in all_frames.values()),
        "avg_density": round(sum(f["density_score"] for f in all_frames.values())/len(CAMERAS),3),
        "active_surges": sum(1 for f in all_frames.values() if f["surge_active"]),
        "cameras": [{"id":c,"name":SCENE_PRESETS[c]["name"],"count":all_frames[c]["people_count"],"risk":all_frames[c]["risk_level"]} for c in CAMERAS],
    }

# ── Alerts ─────────────────────────────────────────────────────────────────────
@app.get("/api/v1/alerts/")
def list_alerts(limit: int = 20, offset: int = 0, severity: str = None):
    global _alerts_cache
    if not _alerts_cache:
        _alerts_cache = generate_alert_history(50)
    alerts = _alerts_cache
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    return {"total": len(alerts), "alerts": alerts[offset:offset+limit], "unacknowledged": sum(1 for a in _alerts_cache if not a["is_acknowledged"])}

@app.post("/api/v1/alerts/{alert_id}/acknowledge")
def ack_alert(alert_id: int):
    global _alerts_cache
    for a in _alerts_cache:
        if a["id"] == alert_id:
            a["is_acknowledged"] = True
            return {"status": "acknowledged"}
    from fastapi import HTTPException
    raise HTTPException(404, "Not found")

@app.get("/api/v1/alerts/stats/summary")
def alert_stats():
    global _alerts_cache
    if not _alerts_cache:
        _alerts_cache = generate_alert_history(50)
    by_sev = {}
    for a in _alerts_cache:
        by_sev[a["severity"]] = by_sev.get(a["severity"],0)+1
    return {"total": len(_alerts_cache), "unacknowledged": sum(1 for a in _alerts_cache if not a["is_acknowledged"]), "by_severity": by_sev, "most_recent": _alerts_cache[0] if _alerts_cache else None}

# ── Predictions ────────────────────────────────────────────────────────────────
@app.get("/api/v1/predictions/{camera_id}")
def forecast(camera_id: str, horizon: int = 30):
    frame = generate_frame_data(camera_id, _cam_state)
    fc = generate_forecast(camera_id, horizon, frame["people_count"])
    max_risk = max((f["stampede_risk_score"] for f in fc), default=0)
    overall = "critical" if max_risk>0.8 else "high" if max_risk>0.5 else "medium" if max_risk>0.25 else "low"
    recs = generate_recommendations(overall, frame["density_score"], frame["people_count"])
    return {"camera_id": camera_id, "camera_name": SCENE_PRESETS.get(camera_id,{}).get("name",camera_id), "current_count": frame["people_count"], "current_density": frame["density_score"], "forecast": fc, "risk_summary": {"overall_risk":overall,"max_stampede_risk":max_risk,"peak_count":max((f["predicted_count"] for f in fc),default=0),"peak_at_minutes":fc[-1]["horizon_minutes"] if fc else 30}, "recommendations": recs, "model": "prophet+lstm_ensemble (simulated)"}

@app.get("/api/v1/predictions/all/overview")
def all_forecasts():
    results = {}
    for c in CAMERAS:
        frame = generate_frame_data(c, _cam_state)
        fc = generate_forecast(c, 30, frame["people_count"])
        max_risk = max((f["stampede_risk_score"] for f in fc), default=0)
        overall = "critical" if max_risk>0.8 else "high" if max_risk>0.5 else "medium" if max_risk>0.25 else "low"
        results[c] = {"camera_name":SCENE_PRESETS[c]["name"],"current_count":frame["people_count"],"risk_summary":{"overall_risk":overall,"max_stampede_risk":round(max_risk,3)}}
    return {"cameras": results}

# ── Heatmaps ───────────────────────────────────────────────────────────────────
@app.get("/api/v1/heatmaps/{camera_id}/current")
def heatmap_current(camera_id: str):
    frame = generate_frame_data(camera_id, _cam_state)
    return {"camera_id":camera_id,"timestamp":frame["timestamp"],"heatmap_matrix":frame["heatmap_data"],"zone_data":frame["zone_data"]}

# ── Cameras ────────────────────────────────────────────────────────────────────
@app.get("/api/v1/stream/cameras")
def list_cameras():
    return {"cameras":[{"id":c,"name":SCENE_PRESETS[c]["name"],"stream_url":f"ws://localhost:8000/api/v1/stream/ws/{c}","status":"active"} for c in CAMERAS]}

# ── WebSocket stream ───────────────────────────────────────────────────────────
@app.websocket("/api/v1/stream/ws/{camera_id}")
async def ws_stream(websocket: WebSocket, camera_id: str, fps: int = Query(default=2)):
    await websocket.accept()
    interval = 1.0 / max(1, min(fps, 10))
    try:
        while True:
            frame = generate_frame_data(camera_id, _cam_state)
            recs = generate_recommendations(frame["risk_level"], frame["density_score"], frame["people_count"])
            await websocket.send_json({"type": "frame", "data": frame, "recommendations": recs, "server_time": datetime.utcnow().isoformat()})
            await asyncio.sleep(interval)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
