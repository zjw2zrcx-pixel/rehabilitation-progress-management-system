# -*- coding: utf-8 -*-
"""SQLAlchemy ORM models — 8 core tables.

users -> therapists (1:1)
users -> patients (1:1, patient login account)
therapists -> patients (1:N responsible therapist)
patients -> rehab_plans (1:N)
rehab_plans -> exercises (1:N)
patients -> training_logs (1:N)
patients -> assessment_records (1:N)
patients -> progress_predictions (1:N)
"""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # admin | therapist | patient
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    therapist = relationship("Therapist", back_populates="user", uselist=False,
                             cascade="all, delete-orphan")
    patient = relationship("Patient", back_populates="user", uselist=False,
                           cascade="all, delete-orphan")


class Therapist(Base):
    __tablename__ = "therapists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    specialization = Column(String(120), default="")
    license_no = Column(String(60), default="")

    user = relationship("User", back_populates="therapist")
    patients = relationship("Patient", back_populates="therapist")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # login account
    therapist_id = Column(Integer, ForeignKey("therapists.id"), nullable=False)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)  # male | female
    diagnosis = Column(String(200), nullable=False)  # e.g. 膝骨关节炎 / 脑卒中
    # 功能性康复目标：长期（出院/末评时点）+ 短期（近期可实现），
    # 表述为可观察的功能行为（如"独立上下楼梯"），而非结构性参数（如"屈曲120°"）
    long_term_goal = Column(Text, default="")
    short_term_goal = Column(Text, default="")
    initial_assessment = Column(Text, default="")  # 初始评估结果摘要
    treatment_stage = Column(String(50), default="初期")  # 初期/中期/后期/维持期
    admission_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="patient")
    therapist = relationship("Therapist", back_populates="patients")
    plans = relationship("RehabPlan", back_populates="patient",
                         cascade="all, delete-orphan")
    assessments = relationship("AssessmentRecord", back_populates="patient",
                               cascade="all, delete-orphan", order_by="AssessmentRecord.assessment_date")
    training_logs = relationship("TrainingLog", back_populates="patient",
                                 cascade="all, delete-orphan")
    predictions = relationship("ProgressPrediction", back_populates="patient",
                               cascade="all, delete-orphan")


class RehabPlan(Base):
    __tablename__ = "rehab_plans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, default="")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), default="进行中")  # 进行中/已完成/已暂停
    frequency_per_week = Column(Integer, default=5)  # 每周频率
    duration_minutes = Column(Integer, default=30)   # 每次训练时长
    notes = Column(Text, default="")

    patient = relationship("Patient", back_populates="plans")
    exercises = relationship("Exercise", back_populates="plan",
                             cascade="all, delete-orphan")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("rehab_plans.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, default="")
    sets = Column(Integer, default=3)
    reps = Column(Integer, default=10)
    duration_min = Column(Integer, default=10)
    target_metric = Column(String(50), default="")  # 目标指标，如 range_of_motion
    progression = Column(String(200), default="")   # 进阶规则

    plan = relationship("RehabPlan", back_populates="exercises")
    logs = relationship("TrainingLog", back_populates="exercise")


class TrainingLog(Base):
    __tablename__ = "training_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("rehab_plans.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=True)
    log_date = Column(Date, nullable=False, index=True)
    completed = Column(Boolean, default=True)
    sets_done = Column(Integer, nullable=True)
    reps_done = Column(Integer, nullable=True)
    duration_min = Column(Integer, nullable=True)
    note = Column(Text, default="")

    patient = relationship("Patient", back_populates="training_logs")
    exercise = relationship("Exercise", back_populates="logs")


class AssessmentRecord(Base):
    __tablename__ = "assessment_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    assessment_date = Column(Date, nullable=False, index=True)
    phase = Column(String(20), default="初期")  # 初期/中期/后期 or 周数
    # 临床整数量表 → Integer 列（NRS/测角器/MMT/Berg/6MWT/Barthel 均为整数记录）
    # training_completion 由打卡自动计算（%可保留 1 位小数），故仍为 Float
    pain_score = Column(Integer, nullable=True)          # 0-10 NRS（整数）
    range_of_motion = Column(Integer, nullable=True)     # deg（测角器读数，整数）
    rom_joint = Column(String(30), default="knee_flexion")
    muscle_strength = Column(Integer, nullable=True)     # 0-5 MMT 徒手肌力（整数）
    balance_score = Column(Integer, nullable=True)       # 0-56 Berg 平衡量表（整数）
    walking_distance = Column(Integer, nullable=True)    # m 6MWT（整数）
    adl_score = Column(Integer, nullable=True)           # 0-100 Barthel 巴氏指数（整数）
    training_completion = Column(Float, nullable=True)   # % 0-100，打卡自动计算
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="assessments")


class ProgressPrediction(Base):
    __tablename__ = "progress_predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    predicted_date = Column(Date, nullable=False)   # 预测的目标日期
    metric = Column(String(50), nullable=False)     # e.g. pain_score
    weeks_ahead = Column(Integer, default=4)        # 预测领先周数
    predicted_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    risk_flag = Column(Boolean, default=False)      # progress risk
    risk_level = Column(String(20), default="正常")  # 正常/低/中/高
    message = Column(Text, default="")
    model_used = Column(String(50), default="LinearRegression")
    r2_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="predictions")