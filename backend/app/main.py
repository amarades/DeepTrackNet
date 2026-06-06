"""
FastAPI main application — DeepTrackNet Platform
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import init_db

# Route imports
from app.api.routes import auth, crowd, alerts, predictions, heatmaps, users, stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle events."""
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"   Simulation mode: {'ON ✓' if settings.SIMULATION_MODE else 'OFF — Real CV Pipeline'}")

    # Initialize DB tables (use Alembic in production)
    try:
        await init_db()
        print("   Database: connected ✓")
    except Exception as e:
        print(f"   Database: failed ({e}) — running without persistence")

    yield

    print("👋 Shutting down DeepTrackNet...")


app = FastAPI(
    title=settings.APP_NAME,
    description="""
## DeepTrackNet — Crowd Monitoring & Predictive Safety Analytics Platform

Real-time AI-powered crowd detection, tracking, density estimation, anomaly detection,
and predictive safety analytics for smart cities, stadiums, airports, and public events.

### Features
- 🎯 YOLOv8 real-time person detection
- 🔍 DeepSORT multi-object tracking
- 📊 Zone-based density estimation
- 🌡️ Dynamic heatmap generation
- ⚠️ Overcrowding detection & risk scoring
- 🚨 Multi-channel alert notifications
- 🔮 30-minute crowd density forecasting
- 💡 AI safety recommendations
    """,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ─────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth.router, prefix=PREFIX + "/auth", tags=["Authentication"])
app.include_router(crowd.router, prefix=PREFIX + "/crowd", tags=["Crowd Analytics"])
app.include_router(alerts.router, prefix=PREFIX + "/alerts", tags=["Alerts"])
app.include_router(predictions.router, prefix=PREFIX + "/predictions", tags=["Predictions"])
app.include_router(heatmaps.router, prefix=PREFIX + "/heatmaps", tags=["Heatmaps"])
app.include_router(users.router, prefix=PREFIX + "/users", tags=["User Management"])
app.include_router(stream.router, prefix=PREFIX + "/stream", tags=["Live Stream"])

# ── Static Files ───────────────────────────────────────────────────────────────
os.makedirs("static/screenshots", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "simulation_mode": settings.SIMULATION_MODE,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
