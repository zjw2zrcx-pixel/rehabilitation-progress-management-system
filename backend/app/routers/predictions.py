# -*- coding: utf-8 -*-
"""Prediction endpoints: run the sklearn regression, store, and list history."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..prediction import predict_metric
from .patients import _authorized_patient

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

METRICS = ["pain_score", "range_of_motion", "muscle_strength",
           "balance_score", "walking_distance", "adl_score", "training_completion"]


@router.get("/patient/{patient_id}", response_model=list[schemas.PredictionOut])
def list_predictions(patient_id: int,
                     user: models.User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    _authorized_patient(db, patient_id, user)
    return db.query(models.ProgressPrediction).filter(
        models.ProgressPrediction.patient_id == patient_id).order_by(
        models.ProgressPrediction.created_at.desc()).limit(60).all()


@router.post("/patient/{patient_id}", response_model=list[schemas.PredictionOut])
def run_predictions(patient_id: int,
                    weeks_ahead: int = Query(default=4, ge=1, le=12),
                    user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Train per-metric linear regressions on the patient's history and
    forecast each metric `weeks_ahead` weeks from the latest assessment."""
    _authorized_patient(db, patient_id, user)
    records = db.query(models.AssessmentRecord).filter(
        models.AssessmentRecord.patient_id == patient_id).order_by(
        models.AssessmentRecord.assessment_date).all()
    if len(records) < 2:
        raise HTTPException(400, "评估记录不足（至少 2 条）才能进行预测")

    latest_date = records[-1].assessment_date
    created = []
    for metric in METRICS:
        points = [(r.assessment_date, getattr(r, metric))
                  for r in records if getattr(r, metric) is not None]
        if len(points) < 2:
            continue
        try:
            result = predict_metric(points, weeks_ahead=weeks_ahead, metric=metric)
        except ValueError as e:
            raise HTTPException(400, str(e))

        pred = models.ProgressPrediction(
            patient_id=patient_id,
            predicted_date=latest_date + timedelta(weeks=weeks_ahead),
            metric=metric,
            weeks_ahead=weeks_ahead,
            predicted_value=result["predicted_value"],
            current_value=result["current_value"],
            risk_flag=result["risk_flag"],
            risk_level=result["risk_level"],
            message=result["message"],
            model_used=result["model"],
            r2_score=result["r2_score"],
        )
        db.add(pred)
        created.append(pred)
    db.commit()
    for p in created:
        db.refresh(p)
    return created