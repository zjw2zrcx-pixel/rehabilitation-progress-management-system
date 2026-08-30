# -*- coding: utf-8 -*-
"""Admin overview stats endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import require_role
from ..database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview", response_model=schemas.OverviewStats)
def overview(admin: models.User = Depends(require_role("admin", "therapist")),
             db: Session = Depends(get_db)):
    total_patients = db.query(models.Patient).count()
    total_assessments = db.query(models.AssessmentRecord).count()
    total_plans = db.query(models.RehabPlan).count()
    avg = db.query(func.avg(models.AssessmentRecord.training_completion)).scalar()
    avg_completion = round(float(avg), 1) if avg is not None else 0.0

    # patients with a latest two-point decline in pain (risk proxy)
    risk_patients = 0
    patients = db.query(models.Patient).all()
    for p in patients:
        recs = db.query(models.AssessmentRecord).filter(
            models.AssessmentRecord.patient_id == p.id).order_by(
            models.AssessmentRecord.assessment_date.desc()).limit(2).all()
        # 疼痛 NRS 变化 ≥ MCID(2分) 才算风险信号（<2 分无统计学意义）
        if len(recs) == 2 and recs[0].pain_score is not None \
                and recs[1].pain_score is not None \
                and recs[0].pain_score >= recs[1].pain_score + 2:
            risk_patients += 1

    return schemas.OverviewStats(
        total_patients=total_patients,
        total_therapists=db.query(models.Therapist).count(),
        total_plans=total_plans,
        total_assessments=total_assessments,
        avg_completion=avg_completion,
        risk_patients=risk_patients,
    )