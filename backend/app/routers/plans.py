# -*- coding: utf-8 -*-
"""Rehab plan + exercise CRUD (therapist/admin writes; patient read-only)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, get_therapist_profile, require_role
from ..database import get_db
from .patients import _patient_or_404

router = APIRouter(prefix="/api/plans", tags=["plans"])


def _plan_or_404(db: Session, pid: int) -> models.RehabPlan:
    p = db.get(models.RehabPlan, pid)
    if p is None:
        raise HTTPException(404, "康复计划不存在")
    return p


@router.get("/patient/{patient_id}", response_model=list[schemas.PlanDetailOut])
def list_plans(patient_id: int,
               user: models.User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    from .patients import _authorized_patient
    _authorized_patient(db, patient_id, user)
    plans = db.query(models.RehabPlan).filter(
        models.RehabPlan.patient_id == patient_id).order_by(
        models.RehabPlan.start_date.desc()).all()
    return plans


@router.get("/{plan_id}", response_model=schemas.PlanDetailOut)
def get_plan(plan_id: int,
             user: models.User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    from .patients import _authorized_patient
    plan = _plan_or_404(db, plan_id)
    _authorized_patient(db, plan.patient_id, user)
    return plan


@router.post("", response_model=schemas.PlanDetailOut, status_code=201)
def create_plan(body: schemas.PlanCreate,
                user: models.User = Depends(require_role("therapist", "admin")),
                db: Session = Depends(get_db)):
    from .patients import _authorized_patient
    _authorized_patient(db, body.patient_id, user)
    plan = models.RehabPlan(**body.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.patch("/{plan_id}", response_model=schemas.PlanDetailOut)
def update_plan(plan_id: int, body: schemas.PlanUpdate,
                user: models.User = Depends(require_role("therapist", "admin")),
                db: Session = Depends(get_db)):
    from .patients import _authorized_patient
    plan = _plan_or_404(db, plan_id)
    _authorized_patient(db, plan.patient_id, user)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=204)
def delete_plan(plan_id: int,
                user: models.User = Depends(require_role("therapist", "admin")),
                db: Session = Depends(get_db)):
    from .patients import _authorized_patient
    plan = _plan_or_404(db, plan_id)
    _authorized_patient(db, plan.patient_id, user)
    db.delete(plan)
    db.commit()
    return None


# ---------- Exercises (nested under plan) ----------
@router.post("/{plan_id}/exercises", response_model=schemas.ExerciseOut, status_code=201)
def add_exercise(plan_id: int, body: schemas.ExerciseCreate,
                 user: models.User = Depends(require_role("therapist", "admin")),
                 db: Session = Depends(get_db)):
    from .patients import _authorized_patient
    plan = _plan_or_404(db, plan_id)
    _authorized_patient(db, plan.patient_id, user)
    ex = models.Exercise(plan_id=plan_id, **body.model_dump())
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.delete("/exercises/{exercise_id}", status_code=204)
def delete_exercise(exercise_id: int,
                    user: models.User = Depends(require_role("therapist", "admin")),
                    db: Session = Depends(get_db)):
    ex = db.get(models.Exercise, exercise_id)
    if ex is None:
        raise HTTPException(404, "训练动作不存在")
    plan = _plan_or_404(db, ex.plan_id)
    from .patients import _authorized_patient
    _authorized_patient(db, plan.patient_id, user)
    db.delete(ex)
    db.commit()
    return None