from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    horizon_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_count: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_density: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_lower: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_upper: Mapped[float] = mapped_column(Float, nullable=False)
    stampede_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    congestion_probability: Mapped[float] = mapped_column(Float, default=0.0)
    model_used: Mapped[str] = mapped_column(String(50), default="prophet")
    features: Mapped[dict] = mapped_column(JSON, default=dict)
    recommended_actions: Mapped[dict] = mapped_column(JSON, default=list)


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    alert_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("alerts.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(5000), nullable=False)
    ai_reasoning: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    actions_taken: Mapped[dict] = mapped_column(JSON, default=list)
    severity: Mapped[str] = mapped_column(String(50), default="medium")
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
