"""
Anomaly Detector — uses Isolation Forest on movement features.
Falls back to statistical threshold in simulation mode.
"""
import math
import random
from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class AnomalyResult:
    score: float           # 0.0 (normal) → 1.0 (highly anomalous)
    is_anomaly: bool
    anomaly_type: str      # "none", "surge", "panic", "unusual_gathering", "reverse_flow"
    confidence: float
    features: Dict[str, float]
    shap_values: Dict[str, float]
    description: str


class AnomalyDetector:
    """
    Detects crowd anomalies using statistical heuristics (simulation)
    or Isolation Forest / LSTM (real mode with trained models).
    """

    ANOMALY_THRESHOLD = 0.55

    def __init__(self, simulation_mode: bool = True):
        self.simulation_mode = simulation_mode
        self._model = None
        self._history: List[Dict] = []

        if not simulation_mode:
            self._load_model()

    def _load_model(self):
        try:
            import joblib
            from app.core.config import settings
            self._model = joblib.load(settings.ANOMALY_MODEL_PATH)
            print("[AnomalyDetector] Model loaded.")
        except Exception as e:
            print(f"[AnomalyDetector] Model load failed ({e}) — using statistical fallback.")
            self.simulation_mode = True

    def analyze(
        self,
        people_count: int,
        density_score: float,
        avg_speed: float,
        flow_direction: str,
        prev_count: int = None,
        surge_active: bool = False,
    ) -> AnomalyResult:
        """Analyze current frame features and return anomaly assessment."""
        features = {
            "people_count": people_count,
            "density_score": density_score,
            "avg_speed": avg_speed,
            "count_delta": people_count - (prev_count or people_count),
            "speed_anomaly": avg_speed / 2.5,  # normalized
        }

        if self.simulation_mode:
            return self._statistical_analyze(features, surge_active, flow_direction)
        else:
            return self._ml_analyze(features)

    def _statistical_analyze(
        self,
        features: Dict[str, float],
        surge_active: bool,
        flow_direction: str,
    ) -> AnomalyResult:
        score = 0.0
        anomaly_type = "none"
        description = "Crowd movement is normal."

        # Density-based scoring
        if features["density_score"] > 0.90:
            score += 0.5
            anomaly_type = "unusual_gathering"
            description = "Extremely high density detected — potential stampede risk."
        elif features["density_score"] > 0.75:
            score += 0.3

        # Surge detection
        if surge_active or abs(features["count_delta"]) > 20:
            score += 0.35
            anomaly_type = "surge"
            description = "Sudden crowd surge detected — density increasing rapidly."

        # Speed anomaly (panic = very fast movement)
        if features["avg_speed"] > 2.0:
            score += 0.25
            anomaly_type = "panic"
            description = "Rapid crowd movement detected — possible panic or evacuation."

        # Directional anomaly
        if flow_direction == "mixed" and features["density_score"] > 0.6:
            score += 0.15
            if anomaly_type == "none":
                anomaly_type = "reverse_flow"
                description = "Multi-directional crowd movement in high-density area."

        # Add noise for realism
        score = min(1.0, score + random.uniform(-0.05, 0.05))

        # Simulate SHAP values (feature attribution)
        total = max(score, 0.01)
        shap_values = {
            "density_score": round(features["density_score"] * 0.4 / total, 3),
            "people_count": round(features["people_count"] / 200 * 0.3 / total, 3),
            "avg_speed": round(features["speed_anomaly"] * 0.2 / total, 3),
            "count_delta": round(abs(features["count_delta"]) / 30 * 0.1 / total, 3),
        }

        return AnomalyResult(
            score=round(score, 3),
            is_anomaly=score >= self.ANOMALY_THRESHOLD,
            anomaly_type=anomaly_type,
            confidence=round(min(0.99, score + 0.1), 2),
            features=features,
            shap_values=shap_values,
            description=description,
        )

    def _ml_analyze(self, features: Dict[str, float]) -> AnomalyResult:
        """Run real Isolation Forest inference."""
        import numpy as np
        X = np.array([[
            features["people_count"],
            features["density_score"],
            features["avg_speed"],
            features["count_delta"],
        ]])
        pred = self._model.predict(X)[0]  # -1 = anomaly, 1 = normal
        score_raw = self._model.score_samples(X)[0]
        score = 1.0 / (1.0 + math.exp(score_raw))  # sigmoid normalization
        return AnomalyResult(
            score=round(score, 3),
            is_anomaly=pred == -1,
            anomaly_type="ml_detected" if pred == -1 else "none",
            confidence=round(score, 2),
            features=features,
            shap_values={},
            description="ML anomaly detection result.",
        )
