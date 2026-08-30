# -*- coding: utf-8 -*-
"""User management (admin), plus lookups shared across roles."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import hash_password, require_role
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[schemas.UserOut])
def list_users(admin: models.User = Depends(require_role("admin")),
               db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.id).all()


@router.patch("/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int,
                body: schemas.UserUpdate,
                admin: models.User = Depends(require_role("admin")),
                db: Session = Depends(get_db)):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(404, "用户不存在")
    data = body.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.get("/therapists", response_model=list[schemas.UserOut])
def list_therapists(db: Session = Depends(get_db),
                    _: models.User = Depends(require_role("admin", "therapist"))):
    return db.query(models.User).filter(models.User.role == "therapist").all()