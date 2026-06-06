"""
YOLOv8 Detector — supports real inference (GPU) and simulation mode (CPU/dev).

In SIMULATION_MODE, returns mock detections matching the real schema exactly.
To enable real inference: pip install ultralytics torch and set SIMULATION_MODE=False.
"""
import random
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.core.config import settings


class Detection:
    def __init__(self, track_id: int, x: int, y: int, w: int, h: int, confidence: float):
        self.track_id = track_id
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.confidence = confidence
        self.cx = x + w // 2
        self.cy = y + h // 2


class YOLODetector:
    """
    YOLOv8 person detector.

    Real mode: loads yolov8n.pt, runs inference on each frame.
    Simulation mode: generates realistic mock detections.
    """

    def __init__(self):
        self.simulation_mode = settings.SIMULATION_MODE
        self.model = None
        self._frame_counter = 0

        if not self.simulation_mode:
            self._load_real_model()

    def _load_real_model(self):
        """Load YOLOv8 model — requires ultralytics package + model weights."""
        try:
            from ultralytics import YOLO
            self.model = YOLO(settings.YOLO_MODEL_PATH)
            print(f"[YOLODetector] Loaded model: {settings.YOLO_MODEL_PATH}")
        except ImportError:
            print("[YOLODetector] ultralytics not installed — falling back to simulation.")
            self.simulation_mode = True
        except Exception as e:
            print(f"[YOLODetector] Model load failed ({e}) — falling back to simulation.")
            self.simulation_mode = True

    def detect(self, frame=None, mock_count: int = 50) -> List[Detection]:
        """
        Run detection on a frame.

        Args:
            frame: numpy array (real mode) or None (simulation)
            mock_count: number of people to simulate (simulation mode only)
        Returns:
            List[Detection]
        """
        self._frame_counter += 1

        if self.simulation_mode:
            return self._simulate_detections(mock_count)
        else:
            return self._real_detect(frame)

    def _simulate_detections(self, count: int) -> List[Detection]:
        detections = []
        for i in range(count):
            x = random.randint(10, 1180)
            y = random.randint(10, 620)
            w = random.randint(40, 80)
            h = random.randint(90, 160)
            conf = round(random.uniform(0.70, 0.99), 2)
            detections.append(Detection(
                track_id=self._frame_counter * 1000 + i,
                x=x, y=y, w=w, h=h,
                confidence=conf,
            ))
        return detections

    def _real_detect(self, frame) -> List[Detection]:
        """Run actual YOLOv8 inference (requires GPU for real-time performance)."""
        if self.model is None or frame is None:
            return []
        results = self.model(frame, classes=[0], conf=0.5, verbose=False)
        detections = []
        for r in results:
            for i, box in enumerate(r.boxes):
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                w = int(x2 - x1)
                h = int(y2 - y1)
                detections.append(Detection(
                    track_id=int(box.id[0]) if box.id is not None else i,
                    x=int(x1), y=int(y1), w=w, h=h,
                    confidence=round(conf, 2),
                ))
        return detections

    def get_stats(self) -> Dict[str, Any]:
        return {
            "mode": "simulation" if self.simulation_mode else "real",
            "model": "yolov8n" if not self.simulation_mode else "mock",
            "frames_processed": self._frame_counter,
        }


# Singleton
_detector_instance: Optional[YOLODetector] = None


def get_detector() -> YOLODetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = YOLODetector()
    return _detector_instance
