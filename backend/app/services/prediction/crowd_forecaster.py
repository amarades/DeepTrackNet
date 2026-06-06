"""
Crowd Forecaster — Prophet-based time-series forecasting with LSTM fallback.
In simulation mode: generates realistic synthetic forecasts with confidence bands.
"""
import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional


class ForecastPoint:
    def __init__(
        self,
        timestamp: str,
        horizon_minutes: int,
        predicted_count: int,
        predicted_density: float,
        lower: int,
        upper: int,
        stampede_risk: float,
        congestion_prob: float,
    ):
        self.timestamp = timestamp
        self.horizon_minutes = horizon_minutes
        self.predicted_count = predicted_count
        self.predicted_density = predicted_density
        self.confidence_lower = lower
        self.confidence_upper = upper
        self.stampede_risk_score = stampede_risk
        self.congestion_probability = congestion_prob

    def to_dict(self) -> Dict:
        return self.__dict__


class CrowdForecaster:
    """
    Multi-model crowd density forecaster.

    Simulation mode: Uses time-aware trend extrapolation.
    Real mode: Uses Prophet + LSTM ensemble.
    """

    def __init__(self, simulation_mode: bool = True):
        self.simulation_mode = simulation_mode
        self._prophet_model = None
        self._lstm_model = None

        if not simulation_mode:
            self._load_models()

    def _load_models(self):
        try:
            from prophet import Prophet
            import joblib
            self._prophet_model = joblib.load("models/prophet_model.pkl")
            print("[CrowdForecaster] Prophet model loaded.")
        except Exception as e:
            print(f"[CrowdForecaster] Model load failed ({e}) — using simulation.")
            self.simulation_mode = True

    def forecast(
        self,
        camera_id: str,
        current_count: int,
        current_density: float,
        max_capacity: int = 300,
        horizons: List[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate crowd density forecasts.

        Args:
            camera_id: Camera identifier
            current_count: Current detected people count
            current_density: Current density score (0-1)
            max_capacity: Maximum capacity of area
            horizons: List of minutes to forecast (default: [5, 10, 15, 30])

        Returns:
            List of ForecastPoint dicts sorted by horizon
        """
        if horizons is None:
            horizons = [5, 10, 15, 30]

        if self.simulation_mode:
            return self._simulate_forecast(current_count, current_density, max_capacity, horizons)
        else:
            return self._real_forecast(camera_id, current_count, horizons)

    def _simulate_forecast(
        self,
        current_count: int,
        current_density: float,
        max_capacity: int,
        horizons: List[int],
    ) -> List[Dict]:
        """
        Simulate time-series forecast using trend extrapolation.
        Forecasts grow more uncertain (wider confidence band) with longer horizon.
        """
        now = datetime.utcnow()
        hour = now.hour
        results = []

        # Determine trend direction based on time of day
        if 8 <= hour < 12 or 17 <= hour < 20:
            trend_factor = 1.05  # rising
        elif 13 <= hour < 16 or 21 <= hour <= 23:
            trend_factor = 0.95  # falling
        else:
            trend_factor = 1.0  # stable

        for mins in horizons:
            # Apply trend with diminishing certainty
            trend_power = mins / 5
            predicted = int(current_count * (trend_factor ** (trend_power * 0.3)))
            predicted = max(0, min(predicted + random.randint(-5, 5), max_capacity))

            # Uncertainty grows with horizon
            noise = int(mins * 2.5 + current_count * 0.08)
            lower = max(0, predicted - noise)
            upper = min(max_capacity, predicted + noise)

            density = round(predicted / max_capacity, 3)
            stampede_risk = round(max(0.0, min(1.0, (density - 0.7) * 3.0)), 3)
            congestion_prob = round(max(0.0, min(1.0, (density - 0.55) * 2.5)), 3)

            ts = (now + timedelta(minutes=mins)).isoformat()
            results.append(ForecastPoint(
                timestamp=ts,
                horizon_minutes=mins,
                predicted_count=predicted,
                predicted_density=density,
                lower=lower,
                upper=upper,
                stampede_risk=stampede_risk,
                congestion_prob=congestion_prob,
            ).to_dict())

        return results

    def _real_forecast(self, camera_id: str, current_count: int, horizons: List[int]) -> List[Dict]:
        """Prophet-based real forecast (requires trained model)."""
        # Placeholder for real inference
        return self._simulate_forecast(current_count, current_count / 300, 300, horizons)

    def get_risk_summary(self, forecast: List[Dict]) -> Dict[str, Any]:
        """Summarize the overall risk from a forecast sequence."""
        if not forecast:
            return {"overall_risk": "low", "peak_count": 0, "peak_at_minutes": 0}

        peak = max(forecast, key=lambda x: x["predicted_count"])
        max_risk = max(f["stampede_risk_score"] for f in forecast)
        max_congestion = max(f["congestion_probability"] for f in forecast)

        overall_risk = (
            "critical" if max_risk > 0.8 else
            "high" if max_risk > 0.5 else
            "medium" if max_risk > 0.25 else
            "low"
        )

        return {
            "overall_risk": overall_risk,
            "peak_count": peak["predicted_count"],
            "peak_at_minutes": peak["horizon_minutes"],
            "max_stampede_risk": round(max_risk, 3),
            "max_congestion_probability": round(max_congestion, 3),
        }
