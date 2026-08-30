# -*- coding: utf-8 -*-
"""Authentication endpoints: register, login, me."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(body: schemas.RegisterIn, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == body.username).first():
        raise HTTPException(400, "用户名已存在")
    if body.email and db.query(models.User).filter(
            models.User.email == body.email).first():
        raise HTTPException(400, "邮箱已被使用")

    user = models.User(
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
        full_name=body.full_name,
        email=body.email,
    )
    db.add(user)
    db.flush()  # get user.id

    # Auto-create linked profile so the account is fully functional.
    if body.role == "therapist":
        db.add(models.Therapist(user_id=user.id,
                                specialization="康复治疗",
                                license_no=f"THR-{user.id:05d}"))
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "用户名或密码错误")
    if not user.is_active:
        raise HTTPException(403, "账号已被禁用")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.TokenOut(access_token=token, role=user.role,
                            full_name=user.full_name)


@router.get("/me", response_model=schemas.UserOut)
def me(current: models.User = Depends(get_current_user)):
    return current