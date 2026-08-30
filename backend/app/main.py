# -*- coding: utf-8 -*-
"""FastAPI application entry point.

Run:  uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .database import Base, engine
from .routers import (
    assessments,
    auth,
    export,
    logs,
    patients,
    plans,
    predictions,
    stats,
    users,
)

app = FastAPI(
    title="Rehab Progress Management System API",
    description="康复进展管理与数据可视化系统 —— FastAPI 后端",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    import app.models  # noqa: F401   register all tables
    Base.metadata.create_all(bind=engine)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok", "service": "rehab-progress-api"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(patients.router)
app.include_router(plans.router)
app.include_router(assessments.router)
app.include_router(logs.router)
app.include_router(predictions.router)
app.include_router(export.router)
app.include_router(stats.router)