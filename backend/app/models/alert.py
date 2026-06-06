import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Enum as SAEnum, JSON, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AlertSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    high = "high"
    critical = "critical"


class AlertType(str, enum.Enum):
    density_exceeded = "density_exceeded"
    crowd_surge = "crowd_surge"
    anomaly_detected = "anomaly_detected"
    panic_detected = "panic_detected"
    zone_overcrowded = "zone_overcrowded"
    prediction_warning = "prediction_warning"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_id: Mapped[str] = mapped_column(String(100), nullable=False)
    crowd_event_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("crowd_events.id"), nullable=True
    )
    severity: Mapped[AlertSeverity] = mapped_column(SAEnum(AlertSeverity), nullable=False)
    alert_type: Mapped[AlertType] = mapped_column(SAEnum(AlertType), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    density_score: Mapped[float] = mapped_column(Float, nullable=False)
    people_count: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    screenshot_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notified_channels: Mapped[dict] = mapped_column(JSON, default=dict)
    # {"email": true, "sms": false, "telegram": true}
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    ai_reasoning: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    shap_values: Mapped[dict] = mapped_column(JSON, default=dict)

    def __repr__(self) -> str:
        return f"<Alert [{self.severity}] {self.alert_type} @ {self.camera_id}>"
