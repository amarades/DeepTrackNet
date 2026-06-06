"""Predictions & Forecasting API routes."""
from fastapi import APIRouter, Query, Path
from app.services.prediction.crowd_forecaster import CrowdForecaster
from app.services.simulation.mock_data_generator import generate_forecast, generate_recommendations, CAMERAS, SCENE_PRESETS, generate_frame_data

router = APIRouter()
forecaster = CrowdForecaster(simulation_mode=True)
_state: dict = {}


@router.get("/{camera_id}")
async def get_forecast(
    camera_id: str = Path(...),
    horizon: int = Query(default=30, ge=5, le=60, description="Forecast horizon in minutes"),
):
    """Get crowd density forecast for the next N minutes."""
    if camera_id not in CAMERAS:
        from fastapi import HTTPException
        raise HTTPException(404, f"Camera '{camera_id}' not found")

    frame = generate_frame_data(camera_id, _state)
    current_count = frame["people_count"]
    current_density = frame["density_score"]
    max_capacity = SCENE_PRESETS[camera_id]["base_count"] + SCENE_PRESETS[camera_id]["variance"]

    forecast_points = forecaster.forecast(
        camera_id=camera_id,
        current_count=current_count,
        current_density=current_density,
        max_capacity=max_capacity,
        horizons=[5, 10, 15, 20, 25, 30][:horizon // 5],
    )

    risk_summary = forecaster.get_risk_summary(forecast_points)
    recommendations = generate_recommendations(
        risk_summary["overall_risk"], current_density, current_count
    )

    return {
        "camera_id": camera_id,
        "camera_name": SCENE_PRESETS[camera_id]["name"],
        "current_count": current_count,
        "current_density": current_density,
        "forecast": forecast_points,
        "risk_summary": risk_summary,
        "recommendations": recommendations,
        "model": "prophet+lstm_ensemble (simulated)",
    }


@router.get("/all/overview")
async def get_all_forecasts():
    """Get 30-minute risk overview for all cameras."""
    results = {}
    for cam_id in CAMERAS:
        frame = generate_frame_data(cam_id, _state)
        forecast = forecaster.forecast(
            cam_id, frame["people_count"], frame["density_score"],
            horizons=[15, 30]
        )
        results[cam_id] = {
            "camera_name": SCENE_PRESETS[cam_id]["name"],
            "current_count": frame["people_count"],
            "risk_summary": forecaster.get_risk_summary(forecast),
        }
    return {"cameras": results}
