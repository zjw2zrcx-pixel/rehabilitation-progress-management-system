# -*- coding: utf-8 -*-
"""Training logs: patients record completion; therapists read."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, require_role
from ..database import get_db
from .patients import _authorized_patient

router = APIRouter(prefix="/api/training-logs", tags=["training-logs"])


@router.get("/patient/{patient_id}", response_model=list[schemas.TrainingLogOut])
def list_logs(patient_id: int,
              user: models.User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    _authorized_patient(db, patient_id, user)
    return db.query(models.TrainingLog).filter(
        models.TrainingLog.patient_id == patient_id).order_by(
        models.TrainingLog.log_date.desc()).limit(200).all()


@router.post("", response_model=schemas.TrainingLogOut, status_code=201)
def create_log(body: schemas.TrainingLogCreate,
               user: models.User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Patient or therapist records a completed/done training session."""
    _authorized_patient(db, body.patient_id, user)
    log = models.TrainingLog(**body.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_log(log_id: int,
               user: models.User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    log = db.get(models.TrainingLog, log_id)
    if log is None:
        raise HTTPException(404, "训练记录不存在")
    _authorized_patient(db, log.patient_id, user)
    db.delete(log)
    db.commit()
    return None