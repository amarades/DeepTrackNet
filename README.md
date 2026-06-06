# DeepTrackNet — Crowd Monitoring & Predictive Safety Analytics Platform

> AI-powered real-time crowd monitoring system using YOLOv8, DeepSORT, FastAPI, and React.

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-blue?logo=react)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Features

| Module | Technology | Status |
|--------|-----------|--------|
| Person Detection | YOLOv8 (simulation mode) | ✅ |
| Multi-Object Tracking | DeepSORT | ✅ Simulated |
| Density Estimation | Zone grid analysis | ✅ |
| Heatmap Generation | OpenCV + Canvas | ✅ |
| Overcrowding Detection | Threshold engine | ✅ |
| Alert System | Email/SMS/Telegram | ✅ |
| Anomaly Detection | Isolation Forest + LSTM | ✅ Simulated |
| Forecasting | Prophet + LSTM ensemble | ✅ Simulated |
| Safety Recommendations | Rule-based + AI | ✅ |
| SHAP Explainability | Feature attribution | ✅ |
| JWT Auth + RBAC | 4 role levels | ✅ |
| Docker Deployment | Full orchestration | ✅ |

---

## Quick Start

### Option 1: Local Development (No Docker)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000 (dashboard) · http://localhost:8000/docs (API)

### Option 2: Docker Compose
```bash
docker-compose up --build
```
Open: http://localhost (nginx) · http://localhost:8000/docs

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@deeptracknet.ai | Admin@123 | Admin |
| security@deeptracknet.ai | Security@123 | Security Officer |
| manager@deeptracknet.ai | Manager@123 | Event Manager |
| viewer@deeptracknet.ai | Viewer@123 | Viewer |

---

## Architecture

```
Browser (React) ──→ Nginx ──→ FastAPI ──→ PostgreSQL
                         ↗         ↘
              WebSocket              Redis (pub/sub)
                         ↘
                    AI Services (YOLO / Mock)
```

## Enabling Real CV Inference

Set `SIMULATION_MODE=false` in `.env` and uncomment in `requirements.txt`:
```
ultralytics==8.2.0
torch==2.3.0
```
Then download YOLO weights: `python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/login | JWT login |
| GET | /api/v1/crowd/live/{cam} | Live stats |
| GET | /api/v1/crowd/history/{cam} | Historical data |
| GET | /api/v1/alerts/ | Alert list |
| POST | /api/v1/alerts/{id}/acknowledge | Acknowledge |
| GET | /api/v1/predictions/{cam} | Forecast |
| GET | /api/v1/heatmaps/{cam}/current | Heatmap data |
| WS | /api/v1/stream/ws/{cam} | Live stream |

Full Swagger docs: http://localhost:8000/docs

---

## Environment Variables

```env
SIMULATION_MODE=true
DATABASE_URL=postgresql+asyncpg://crowd:crowdpass@localhost:5432/deeptracknet
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
TELEGRAM_BOT_TOKEN=optional
TWILIO_ACCOUNT_SID=optional
```

---

## Project Structure

```
deeptracknet/
├── backend/                 # FastAPI + AI services
│   ├── app/
│   │   ├── api/routes/      # REST + WebSocket endpoints
│   │   ├── core/            # Config, auth, database
│   │   ├── models/          # SQLAlchemy ORM
│   │   └── services/        # CV, ML, alerts, simulation
│   └── requirements.txt
├── frontend/                # React + Tailwind dashboard
│   └── src/
│       ├── pages/           # Dashboard, Analytics, Forecasting, Alerts
│       ├── components/      # LiveFeed, HeatmapViewer, charts
│       ├── store/           # Zustand state
│       └── hooks/           # useWebSocket
├── nginx/                   # Reverse proxy config
├── ml/                      # Model training scripts
├── docker-compose.yml
└── docs/
```

---

## Research Metrics

| Metric | Description |
|--------|-------------|
| mAP@0.5 | YOLO detection accuracy |
| RMSE | Forecast error |
| F1 Score | Alert precision/recall |
| Anomaly AUC | Detector ROC-AUC |

---

*Built for Smart Cities · Stadiums · Airports · Universities · Public Events*
