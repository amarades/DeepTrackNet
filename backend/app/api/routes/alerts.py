"""Alerts API routes."""
from datetime import datetime
from fastapi import APIRouter, Query
from app.services.simulation.mock_data_generator import generate_alert_history

router = APIRouter()
_alert_cache: list = []


def _get_alerts(count: int = 50):
    global _alert_cache
    if not _alert_cache:
        _alert_cache = generate_alert_history(count=50)
    return _alert_cache


@router.get("/")
async def list_alerts(
    severity: str = Query(default=None, description="Filter by severity"),
    acknowledged: bool = Query(default=None, description="Filter by acknowledged status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """List all alerts with optional filters."""
    alerts = _get_alerts()
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    if acknowledged is not None:
        alerts = [a for a in alerts if a["is_acknowledged"] == acknowledged]
    total = len(alerts)
    return {
        "total": total,
        "alerts": alerts[offset: offset + limit],
        "unacknowledged": sum(1 for a in _get_alerts() if not a["is_acknowledged"]),
    }


@router.get("/{alert_id}")
async def get_alert(alert_id: int):
    """Get a specific alert by ID."""
    alerts = _get_alerts()
    alert = next((a for a in alerts if a["id"] == alert_id), None)
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(404, "Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, acknowledged_by: str = "system"):
    """Acknowledge an alert."""
    alerts = _get_alerts()
    for a in alerts:
        if a["id"] == alert_id:
            a["is_acknowledged"] = True
            a["acknowledged_by"] = acknowledged_by
            a["acknowledged_at"] = datetime.utcnow().isoformat()
            return {"status": "acknowledged", "alert": a}
    from fastapi import HTTPException
    raise HTTPException(404, "Alert not found")


@router.get("/stats/summary")
async def alert_stats():
    """Alert statistics for the dashboard."""
    alerts = _get_alerts()
    by_severity = {"info": 0, "warning": 0, "high": 0, "critical": 0}
    by_type = {}
    for a in alerts:
        by_severity[a["severity"]] = by_severity.get(a["severity"], 0) + 1
        by_type[a["alert_type"]] = by_type.get(a["alert_type"], 0) + 1
    return {
        "total": len(alerts),
        "unacknowledged": sum(1 for a in alerts if not a["is_acknowledged"]),
        "by_severity": by_severity,
        "by_type": by_type,
        "most_recent": alerts[0] if alerts else None,
    }
