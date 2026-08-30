# -*- coding: utf-8 -*-
"""CSV data export (per patient assessments, my logs).
Uses the `csv` stdlib module — no pandas dependency at runtime for exports.
"""
import csv
from io import StringIO

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_user
from ..database import get_db
from .patients import _authorized_patient

router = APIRouter(prefix="/api/export", tags=["export"])

ASSESSMENT_HEADERS = [
    "assessment_date", "phase", "pain_score", "range_of_motion", "rom_joint",
    "muscle_strength", "balance_score", "walking_distance", "adl_score",
    "training_completion", "notes",
]


def _csv_response(rows: list[list], filename: str) -> StreamingResponse:
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/patient/{patient_id}/assessments")
def export_assessments(patient_id: int,
                       user: models.User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    _authorized_patient(db, patient_id, user)
    records = db.query(models.AssessmentRecord).filter(
        models.AssessmentRecord.patient_id == patient_id).order_by(
        models.AssessmentRecord.assessment_date).all()
    rows = [ASSESSMENT_HEADERS] + [
        [r.assessment_date, r.patient_id, r.pain_score, r.range_of_motion,
         r.rom_joint, r.muscle_strength, r.balance_score, r.walking_distance,
         r.adl_score, r.training_completion, r.notes]
        for r in records
    ]
    return _csv_response(rows, f"patient_{patient_id}_assessments.csv")


@router.get("/patient/{patient_id}/training")
def export_training(patient_id: int,
                    user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    _authorized_patient(db, patient_id, user)
    logs = db.query(models.TrainingLog).filter(
        models.TrainingLog.patient_id == patient_id).order_by(
        models.TrainingLog.log_date).all()
    rows = [["log_date", "plan_id", "exercise_id", "completed",
             "sets_done", "reps_done", "duration_min", "note"]] + [
        [l.log_date, l.plan_id, l.exercise_id, l.completed, l.sets_done,
         l.reps_done, l.duration_min, l.note]
        for l in logs
    ]
    return _csv_response(rows, f"patient_{patient_id}_training.csv")