from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List, Optional
import secrets


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "CrowdSafe AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SIMULATION_MODE: bool = True  # Use mock data instead of real CV inference

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://crowd:crowdpass@localhost:5432/crowdsafe"
    DATABASE_URL_SYNC: str = "postgresql://crowd:crowdpass@localhost:5432/crowdsafe"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── CORS ──────────────────────────────────────────────────────────────────
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
    ]

    # ── Crowd Thresholds ──────────────────────────────────────────────────────
    DENSITY_LOW_THRESHOLD: float = 0.3
    DENSITY_MEDIUM_THRESHOLD: float = 0.55
    DENSITY_HIGH_THRESHOLD: float = 0.75
    DENSITY_CRITICAL_THRESHOLD: float = 0.90

    COUNT_MEDIUM_THRESHOLD: int = 50
    COUNT_HIGH_THRESHOLD: int = 100
    COUNT_CRITICAL_THRESHOLD: int = 200

    # ── Alert Config ──────────────────────────────────────────────────────────
    ALERT_COOLDOWN_SECONDS: int = 300  # 5 minutes between same-type alerts

    # ── Email Notifications ───────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    ALERT_EMAIL_RECIPIENTS: List[str] = []

    # ── Telegram Notifications ────────────────────────────────────────────────
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_IDS: List[str] = []

    # ── Twilio SMS ────────────────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    ALERT_SMS_RECIPIENTS: List[str] = []

    # ── Camera / Stream ───────────────────────────────────────────────────────
    DEFAULT_CAMERA_SOURCE: str = "0"  # 0 = webcam, or RTSP URL
    FRAME_RATE: int = 10
    ZONE_GRID_ROWS: int = 3
    ZONE_GRID_COLS: int = 4

    # ── ML Models ─────────────────────────────────────────────────────────────
    YOLO_MODEL_PATH: str = "models/yolov8n.pt"
    ANOMALY_MODEL_PATH: str = "models/anomaly_model.pkl"
    LSTM_MODEL_PATH: str = "models/lstm_model.h5"

    # ── Prediction ────────────────────────────────────────────────────────────
    FORECAST_HORIZONS: List[int] = [5, 10, 15, 30]  # minutes

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
