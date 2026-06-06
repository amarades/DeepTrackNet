import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Enum as SAEnum, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class CrowdEvent(Base):
    __tablename__ = "crowd_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    people_count: Mapped[int] = mapped_column(Integer, nullable=False)
    density_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 - 1.0
    risk_level: Mapped[RiskLevel] = mapped_column(SAEnum(RiskLevel), default=RiskLevel.low)
    zone_data: Mapped[dict] = mapped_column(JSON, default=dict)
    # {"zone_00": {"count": 12, "density": 0.6, "risk": "high"}, ...}
    avg_speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    flow_direction: Mapped[str | None] = mapped_column(String(50), nullable=True)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)
    frame_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tracked_ids: Mapped[dict] = mapped_column(JSON, default=dict)
    # {"active": 34, "entries": 5, "exits": 2}

    def __repr__(self) -> str:
        return f"<CrowdEvent cam={self.camera_id} count={self.people_count} risk={self.risk_level}>"
