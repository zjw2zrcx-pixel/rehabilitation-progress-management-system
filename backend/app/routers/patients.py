# -*- coding: utf-8 -*-
"""Patient CRUD + access policy.

Policy (role-based):
- admin: 所有患者
- therapist: 本人负责的患者（therapist.profile 关联）
- patient: 自己的档案（通过 user_id 关联）
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, get_therapist_profile, require_role
from ..database import get_db

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _patient_or_404(db: Session, pid: int) -> models.Patient:
    p = db.get(models.Patient, pid)
    if p is None:
        raise HTTPException(404, "患者不存在")
    return p


def _authorized_patient(db: Session, pid: int, user: models.User) -> models.Patient:
    p = _patient_or_404(db, pid)
    if user.role == "admin":
        return p
    if user.role == "therapist":
        t = get_therapist_profile(user, db)
        if p.therapist_id != t.id:
            raise HTTPException(403, "无权访问该患者")
        return p
    # patient: only their own record
    if p.user_id != user.id:
        raise HTTPException(403, "无权访问该患者")
    return p


@router.get("", response_model=list[schemas.PatientOut])
def list_patients(user: models.User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    q = db.query(models.Patient)
    if user.role == "therapist":
        t = get_therapist_profile(user, db)
        q = q.filter(models.Patient.therapist_id == t.id)
    elif user.role == "patient":
        q = q.filter(models.Patient.user_id == user.id)
    patients = q.order_by(models.Patient.id).all()
    # attach therapist display name
    out = []
    for p in patients:
        item = schemas.PatientOut.model_validate(p)
        if p.therapist:
            item.therapist_name = p.therapist.user.full_name
        out.append(item)
    return out


@router.get("/{pid}", response_model=schemas.PatientOut)
def get_patient(pid: int,
                user: models.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    p = _authorized_patient(db, pid, user)
    out = schemas.PatientOut.model_validate(p)
    if p.therapist:
        out.therapist_name = p.therapist.user.full_name
    return out


@router.post("", response_model=schemas.PatientOut, status_code=201)
def create_patient(body: schemas.PatientCreate,
                   user: models.User = Depends(require_role("therapist", "admin")),
                   db: Session = Depends(get_db)):
    therapist_id = body.therapist_id
    if user.role == "therapist":
        t = get_therapist_profile(user, db)
        if therapist_id != t.id:
            raise HTTPException(403, "只能为自己负责的患者建档")
    patient = models.Patient(**body.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    out = schemas.PatientOut.model_validate(patient)
    if patient.therapist:
        out.therapist_name = patient.therapist.user.full_name
    return out


@router.patch("/{pid}", response_model=schemas.PatientOut)
def update_patient(pid: int, body: schemas.PatientUpdate,
                   user: models.User = Depends(require_role("therapist", "admin")),
                   db: Session = Depends(get_db)):
    p = _authorized_patient(db, pid, user)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    out = schemas.PatientOut.model_validate(p)
    if p.therapist:
        out.therapist_name = p.therapist.user.full_name
    return out


@router.delete("/{pid}", status_code=204)
def delete_patient(pid: int,
                   user: models.User = Depends(require_role("therapist", "admin")),
                   db: Session = Depends(get_db)):
    p = _authorized_patient(db, pid, user)
    db.delete(p)
    db.commit()
    return None