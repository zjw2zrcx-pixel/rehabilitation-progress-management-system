# -*- coding: utf-8 -*-
"""Pydantic schemas for request / response validation."""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)
    role: str = Field(pattern="^(admin|therapist|patient)$")
    full_name: str = Field(min_length=1, max_length=100)
    email: Optional[EmailStr] = None


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


# ---------- Users ----------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    role: str
    full_name: str
    email: Optional[str] = None
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6)


# ---------- Patients ----------
class PatientBase(BaseModel):
    name: str
    age: int = Field(ge=0, le=120)
    gender: str = Field(pattern="^(male|female)$")
    diagnosis: str
    # 功能性康复目标（区分长期/短期，表述为可观察功能如"独立上下楼"）
    long_term_goal: str = ""
    short_term_goal: str = ""
    initial_assessment: str = ""
    treatment_stage: str = "初期"
    admission_date: Optional[date] = None


class PatientCreate(PatientBase):
    therapist_id: int


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=120)
    gender: Optional[str] = Field(default=None, pattern="^(male|female)$")
    diagnosis: Optional[str] = None
    long_term_goal: Optional[str] = None
    short_term_goal: Optional[str] = None
    initial_assessment: Optional[str] = None
    treatment_stage: Optional[str] = None
    admission_date: Optional[date] = None
    therapist_id: Optional[int] = None


class PatientOut(PatientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    therapist_id: int
    therapist_name: Optional[str] = None
    created_at: datetime


# ---------- Plans / Exercises ----------
class ExerciseCreate(BaseModel):
    name: str
    description: str = ""
    sets: int = 3
    reps: int = 10
    duration_min: int = 10
    target_metric: str = ""
    progression: str = ""


class ExerciseOut(ExerciseCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plan_id: int


class PlanCreate(BaseModel):
    patient_id: int
    title: str
    description: str = ""
    start_date: date
    end_date: Optional[date] = None
    status: str = "进行中"
    frequency_per_week: int = Field(default=5, ge=1, le=7)
    duration_minutes: int = Field(default=30, ge=5)
    notes: str = ""


class PlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    frequency_per_week: Optional[int] = Field(default=None, ge=1, le=7)
    duration_minutes: Optional[int] = Field(default=None, ge=1)
    notes: Optional[str] = None


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    title: str
    description: str
    start_date: date
    end_date: Optional[date]
    status: str
    frequency_per_week: int
    duration_minutes: int
    notes: str


class PlanDetailOut(PlanOut):
    exercises: List[ExerciseOut] = []


# ---------- Training logs ----------
class TrainingLogCreate(BaseModel):
    patient_id: int
    plan_id: int
    exercise_id: Optional[int] = None
    log_date: date
    completed: bool = True
    sets_done: Optional[int] = None
    reps_done: Optional[int] = None
    duration_min: Optional[int] = None
    note: str = ""


class TrainingLogOut(TrainingLogCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Assessments ----------
# 7 项评估指标均为临床整数量表（小数提交返回 422）：
#   NRS 0-10 · 测角器度数 · MMT 肌力 0-5 · Berg 平衡 0-56 · 6MWT 米 · Barthel 0-100
class AssessmentCreate(BaseModel):
    patient_id: int
    assessment_date: date
    phase: str = "初期"
    pain_score: Optional[int] = Field(default=None, ge=0, le=10)      # NRS 数字评分法
    range_of_motion: Optional[int] = Field(default=None, ge=0, le=180)
    rom_joint: str = "knee_flexion"
    muscle_strength: Optional[int] = Field(default=None, ge=0, le=5)  # MMT 徒手肌力分级
    balance_score: Optional[int] = Field(default=None, ge=0, le=56)   # Berg 平衡量表
    walking_distance: Optional[int] = Field(default=None, ge=0, le=1000)  # 6MWT(米)
    adl_score: Optional[int] = Field(default=None, ge=0, le=100)      # Barthel 巴氏指数
    training_completion: Optional[float] = Field(default=None, ge=0, le=100)  # 仅内部使用（由打卡自动计算）
    notes: str = ""


class AssessmentUpdate(BaseModel):
    """PATCH：字段均可选；training_completion 不接受手工修改（自动计算）。"""
    patient_id: Optional[int] = None
    assessment_date: Optional[date] = None
    phase: Optional[str] = None
    pain_score: Optional[int] = Field(default=None, ge=0, le=10)
    range_of_motion: Optional[int] = Field(default=None, ge=0, le=180)
    rom_joint: Optional[str] = None
    muscle_strength: Optional[int] = Field(default=None, ge=0, le=5)
    balance_score: Optional[int] = Field(default=None, ge=0, le=56)
    walking_distance: Optional[int] = Field(default=None, ge=0, le=1000)
    adl_score: Optional[int] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = None


class AssessmentOut(AssessmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# ---------- Prediction ----------
class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    metric: str
    weeks_ahead: int
    predicted_value: float
    current_value: float
    predicted_date: date
    risk_flag: bool
    risk_level: str
    message: str
    model_used: str
    r2_score: Optional[float]
    created_at: datetime


# ---------- Dashboard ----------
class TrendPoint(BaseModel):
    date: date
    value: Optional[float]


class PatientTrends(BaseModel):
    patient_id: int
    metrics: dict  # metric -> [TrendPoint]


class InsightOut(BaseModel):
    patient_id: int
    risk_flag: bool
    risk_level: str
    messages: List[str]


class OverviewStats(BaseModel):
    total_patients: int
    total_therapists: int
    total_plans: int
    total_assessments: int
    avg_completion: float
    risk_patients: int