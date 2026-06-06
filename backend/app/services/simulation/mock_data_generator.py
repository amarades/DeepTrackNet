"""
Mock Data Generator — simulates realistic crowd sensor data for development.

When SIMULATION_MODE=True, this replaces real YOLOv8 + DeepSORT inference.
All outputs match the exact same schema as the real CV pipeline.
"""
import asyncio
import math
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
import numpy as np


# ── Simulation parameters ─────────────────────────────────────────────────────
CAMERAS = ["CAM_01", "CAM_02", "CAM_03", "CAM_04"]

SCENE_PRESETS = {
    "CAM_01": {"name": "Main Entrance", "base_count": 80, "variance": 30},
    "CAM_02": {"name": "Food Court", "base_count": 120, "variance": 50},
    "CAM_03": {"name": "Emergency Exit", "base_count": 20, "variance": 10},
    "CAM_04": {"name": "Central Plaza", "base_count": 200, "variance": 80},
}


def _time_multiplier() -> float:
    """Simulate realistic crowd patterns based on time of day."""
    hour = datetime.now().hour
    # Morning ramp-up
    if 6 <= hour < 9:
        return 0.3 + (hour - 6) * 0.15
    # Morning peak
    elif 9 <= hour < 11:
        return 0.75
    # Lunch surge
    elif 11 <= hour < 14:
        return 1.0 + math.sin((hour - 11) * math.pi / 3) * 0.3
    # Afternoon lull
    elif 14 <= hour < 17:
        return 0.6
    # Evening peak
    elif 17 <= hour < 20:
        return 0.9 + math.sin((hour - 17) * math.pi / 3) * 0.2
    # Night wind-down
    elif 20 <= hour < 23:
        return 0.4 - (hour - 20) * 0.1
    else:
        return 0.1


def generate_frame_data(camera_id: str, _state: Dict = {}) -> Dict[str, Any]:
    """Generate one frame worth of detection data for a camera."""
    preset = SCENE_PRESETS.get(camera_id, SCENE_PRESETS["CAM_01"])
    t_mult = _time_multiplier()

    # Smoothly evolve crowd count
    if camera_id not in _state:
        _state[camera_id] = {
            "count": int(preset["base_count"] * t_mult),
            "entry_total": 0,
            "exit_total": 0,
            "next_id": 1,
            "active_ids": set(),
            "surge_active": False,
            "surge_end": 0,
        }

    st = _state[camera_id]

    # Random surge events (every ~5 minutes, 30s duration)
    now_ts = time.time()
    if not st["surge_active"] and random.random() < 0.002:
        st["surge_active"] = True
        st["surge_end"] = now_ts + 30

    surge_factor = 1.5 if st["surge_active"] else 1.0
    if st["surge_active"] and now_ts > st["surge_end"]:
        st["surge_active"] = False
        surge_factor = 1.0

    target_count = int(preset["base_count"] * t_mult * surge_factor)
    delta = random.randint(-5, 5)
    new_count = max(0, min(
        target_count + delta,
        preset["base_count"] + preset["variance"]
    ))

    # Track entry/exits
    diff = new_count - st["count"]
    if diff > 0:
        st["entry_total"] += diff
    else:
        st["exit_total"] += abs(diff)
    st["count"] = new_count

    # Generate zone data (3x4 grid = 12 zones)
    zones: Dict[str, Any] = {}
    total_zone_density = 0.0
    for r in range(3):
        for c in range(4):
            key = f"zone_{r}{c}"
            # Zones near center are denser
            center_dist = abs(r - 1) + abs(c - 1.5)
            zone_weight = max(0.1, 1.0 - center_dist * 0.2)
            zone_count = max(0, int(new_count * zone_weight / 8 + random.randint(-3, 3)))
            density = min(1.0, zone_count / 30.0)  # max capacity 30 per zone
            total_zone_density += density
            risk = (
                "critical" if density > 0.9 else
                "high" if density > 0.75 else
                "medium" if density > 0.55 else
                "low"
            )
            zones[key] = {
                "count": zone_count,
                "density": round(density, 3),
                "risk": risk,
                "row": r,
                "col": c,
            }

    avg_density = min(1.0, new_count / (preset["base_count"] + preset["variance"]))
    overall_risk = (
        "critical" if avg_density > 0.9 else
        "high" if avg_density > 0.75 else
        "medium" if avg_density > 0.55 else
        "low"
    )

    # Simulate bounding boxes
    bboxes = []
    for i in range(new_count):
        x = random.randint(10, 1200)
        y = random.randint(10, 700)
        bboxes.append({
            "id": st["next_id"] + i,
            "x": x, "y": y,
            "w": random.randint(40, 80),
            "h": random.randint(80, 160),
            "confidence": round(random.uniform(0.72, 0.99), 2),
        })
    st["next_id"] += new_count

    # Movement analytics
    avg_speed = round(random.uniform(0.5, 2.5) * (1.5 if st["surge_active"] else 1.0), 2)
    directions = ["north", "south", "east", "west", "mixed"]
    flow_direction = random.choice(directions)

    # Anomaly score (higher during surges)
    anomaly_score = round(
        min(1.0, random.uniform(0.0, 0.15) + (0.6 if st["surge_active"] else 0.0)),
        3
    )

    return {
        "camera_id": camera_id,
        "camera_name": preset["name"],
        "timestamp": datetime.utcnow().isoformat(),
        "people_count": new_count,
        "density_score": round(avg_density, 3),
        "risk_level": overall_risk,
        "zone_data": zones,
        "bounding_boxes": bboxes[:50],  # cap for WS payload size
        "tracked_ids": {
            "active": new_count,
            "entries": st["entry_total"],
            "exits": st["exit_total"],
        },
        "avg_speed": avg_speed,
        "flow_direction": flow_direction,
        "anomaly_score": anomaly_score,
        "surge_active": st["surge_active"],
        "heatmap_data": _generate_heatmap_matrix(zones),
        "frame_width": 1280,
        "frame_height": 720,
    }


def _generate_heatmap_matrix(zones: Dict) -> List[List[float]]:
    """Convert zone densities to a 3x4 matrix for frontend heatmap rendering."""
    matrix = [[0.0] * 4 for _ in range(3)]
    for key, data in zones.items():
        r, c = data["row"], data["col"]
        matrix[r][c] = data["density"]
    return matrix


def generate_historical_data(
    camera_id: str,
    hours: int = 24,
    interval_minutes: int = 5
) -> List[Dict[str, Any]]:
    """Generate historical time-series data for analytics charts."""
    preset = SCENE_PRESETS.get(camera_id, SCENE_PRESETS["CAM_01"])
    records = []
    now = datetime.utcnow()
    points = (hours * 60) // interval_minutes

    for i in range(points, 0, -1):
        ts = now - timedelta(minutes=i * interval_minutes)
        hour = ts.hour
        # Time-based multiplier
        if 9 <= hour < 11 or 17 <= hour < 20:
            mult = 0.85 + random.uniform(-0.1, 0.15)
        elif 12 <= hour < 14:
            mult = 1.0 + random.uniform(-0.1, 0.2)
        elif 0 <= hour < 6:
            mult = 0.1 + random.uniform(-0.05, 0.05)
        else:
            mult = 0.5 + random.uniform(-0.15, 0.15)

        count = max(0, int(preset["base_count"] * mult + random.randint(-10, 10)))
        density = min(1.0, count / (preset["base_count"] + preset["variance"]))

        records.append({
            "timestamp": ts.isoformat(),
            "people_count": count,
            "density_score": round(density, 3),
            "risk_level": (
                "critical" if density > 0.9 else
                "high" if density > 0.75 else
                "medium" if density > 0.55 else
                "low"
            ),
        })
    return records


def generate_forecast(
    camera_id: str,
    horizon_minutes: int = 30,
    current_count: int = 100,
) -> List[Dict[str, Any]]:
    """Generate prediction data with confidence intervals."""
    preset = SCENE_PRESETS.get(camera_id, SCENE_PRESETS["CAM_01"])
    forecast = []
    now = datetime.utcnow()

    for mins in range(5, horizon_minutes + 1, 5):
        ts = now + timedelta(minutes=mins)
        hour = ts.hour
        trend = 1.0 + math.sin(mins / 30 * math.pi) * 0.15
        predicted = max(0, int(current_count * trend + random.randint(-8, 8)))
        noise = mins * 1.5  # uncertainty grows with horizon
        density = min(1.0, predicted / (preset["base_count"] + preset["variance"]))
        stampede_risk = min(1.0, max(0.0, density - 0.6) * 2.5)
        congestion_prob = min(1.0, max(0.0, density - 0.5) * 2.0)

        forecast.append({
            "timestamp": ts.isoformat(),
            "horizon_minutes": mins,
            "predicted_count": predicted,
            "predicted_density": round(density, 3),
            "confidence_lower": max(0, predicted - int(noise)),
            "confidence_upper": predicted + int(noise),
            "stampede_risk_score": round(stampede_risk, 3),
            "congestion_probability": round(congestion_prob, 3),
            "model_used": "prophet+lstm_ensemble",
        })
    return forecast


def generate_alert_history(count: int = 20) -> List[Dict[str, Any]]:
    """Generate sample alert history for the alert center."""
    alert_types = [
        ("density_exceeded", "warning", "Density threshold exceeded in Zone C3"),
        ("crowd_surge", "high", "Sudden crowd surge detected — 40% increase in 2 minutes"),
        ("anomaly_detected", "high", "Unusual movement pattern: crowd splitting"),
        ("zone_overcrowded", "critical", "Zone B2 at 95% capacity — immediate action required"),
        ("prediction_warning", "warning", "Forecast: High density expected in 15 minutes"),
        ("panic_detected", "critical", "Rapid dispersal pattern detected — possible panic"),
    ]

    alerts = []
    now = datetime.utcnow()
    for i in range(count):
        atype, severity, msg = random.choice(alert_types)
        cam = random.choice(CAMERAS)
        ts = now - timedelta(minutes=random.randint(5, 720))
        density = round(random.uniform(0.55, 0.99), 2)
        count_val = int(density * (SCENE_PRESETS[cam]["base_count"] + SCENE_PRESETS[cam]["variance"]))
        alerts.append({
            "id": i + 1,
            "camera_id": cam,
            "camera_name": SCENE_PRESETS[cam]["name"],
            "severity": severity,
            "alert_type": atype,
            "message": msg,
            "density_score": density,
            "people_count": count_val,
            "location": SCENE_PRESETS[cam]["name"],
            "is_acknowledged": random.random() > 0.4,
            "created_at": ts.isoformat(),
            "ai_reasoning": f"Anomaly score {round(random.uniform(0.6, 0.99), 2)} exceeded threshold. "
                            f"Features: density={density}, speed=+{round(random.uniform(0.5, 2.0), 1)}m/s, "
                            f"direction_change=True",
            "shap_values": {
                "density_score": round(random.uniform(0.3, 0.5), 3),
                "people_count": round(random.uniform(0.1, 0.3), 3),
                "avg_speed": round(random.uniform(0.05, 0.2), 3),
                "anomaly_score": round(random.uniform(0.1, 0.3), 3),
            },
        })
    return sorted(alerts, key=lambda x: x["created_at"], reverse=True)


def generate_recommendations(risk_level: str, density: float, count: int) -> List[Dict]:
    """Rule-based + scenario-aware safety recommendations."""
    recs = []
    if risk_level == "critical" or density > 0.9:
        recs += [
            {"priority": "immediate", "action": "Trigger emergency evacuation protocol", "icon": "🚨"},
            {"priority": "immediate", "action": "Deploy all available security personnel", "icon": "👮"},
            {"priority": "immediate", "action": "Open all emergency exits", "icon": "🚪"},
            {"priority": "immediate", "action": "Activate PA system for crowd dispersal", "icon": "📢"},
        ]
    elif risk_level == "high" or density > 0.75:
        recs += [
            {"priority": "urgent", "action": "Open additional entry/exit gates", "icon": "🚪"},
            {"priority": "urgent", "action": "Redirect crowd flow to Zone A (low density)", "icon": "↗️"},
            {"priority": "urgent", "action": "Deploy 4 additional security officers", "icon": "👮"},
            {"priority": "urgent", "action": "Pause new entries until density drops below 60%", "icon": "⛔"},
        ]
    elif risk_level == "medium" or density > 0.55:
        recs += [
            {"priority": "advisory", "action": "Monitor Zone B2 & B3 closely", "icon": "👁️"},
            {"priority": "advisory", "action": "Pre-position security at bottleneck areas", "icon": "📍"},
            {"priority": "advisory", "action": "Increase CCTV monitoring frequency", "icon": "📹"},
        ]
    else:
        recs += [
            {"priority": "info", "action": "Situation normal — continue routine monitoring", "icon": "✅"},
            {"priority": "info", "action": "Review forecast for next 30 minutes", "icon": "🔮"},
        ]
    return recs
