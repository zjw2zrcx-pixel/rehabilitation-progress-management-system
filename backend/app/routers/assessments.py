# -*- coding: utf-8 -*-
"""Assessment records CRUD + dashboard trends + risk insights."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, require_role
from ..database import get_db
from ..prediction import BOUNDS
from .patients import _authorized_patient

router = APIRouter(prefix="/api/assessments", tags=["assessments"])

TREND_METRICS = [
    "pain_score", "range_of_motion", "muscle_strength", "balance_score",
    "walking_distance", "adl_score", "training_completion",
]

# 疼痛 NRS 量表的最小临床意义变化（MCID）= 2 分，变化不足 2 分视为无临床意义
PAIN_MCID = 2.0


def week_completion(db: Session, patient_id: int, on_date: date):
    """按周自动计算训练完成率（%）。

    规则：取评估日期所在自然周（周一至周日）内该患者的全部训练打卡，
    完成率 = 已完成(completed=True)打卡次数 / 当周打卡总次数 × 100。
    当周无打卡记录时返回 None（不视为 0%，避免误读为严重不足）。
    """
    start = on_date - timedelta(days=on_date.weekday())
    end = start + timedelta(days=7)
    logs = db.query(models.TrainingLog).filter(
        models.TrainingLog.patient_id == patient_id,
        models.TrainingLog.log_date >= start,
        models.TrainingLog.log_date < end,
    ).all()
    if not logs:
        return None
    done = sum(1 for l in logs if l.completed)
    return round(100.0 * done / len(logs), 1)


def composite_score(record: models.AssessmentRecord) -> float | None:
    """综合恢复指数 0-100：各指标按临床量表范围归一化后取平均 ×100。

    公式（对当次评估已记录的指标逐一计算，缺失指标不计入）：
      正向指标（越高越好）：norm = (实际值 - 下限) / (上限 - 下限)
      疼痛（越低越好）   ：norm = (上限 - 实际值) / (上限 - 下限)
      composite = mean(norm) × 100
    归一化上/下限取自已发布量表的可接受范围（BOUNDS，见 prediction.py）：
      NRS 疼痛 0-10、ROM 0-180°、MMT 肌力 0-5、Berg 平衡 0-56、
      6MWT 步行 0-1000m、Barthel ADL 0-100、完成率 0-100%。
    """
    norms = []
    for m in TREND_METRICS:
        v = getattr(record, m)
        if v is None:
            continue
        lo, hi = BOUNDS.get(m, (0.0, 100.0))
        span = hi - lo
        if span <= 0:
            continue
        if m == "pain_score":
            norms.append((hi - v) / span)
        else:
            norms.append((v - lo) / span)
    if not norms:
        return None
    return round(100.0 * sum(norms) / len(norms), 1)


@router.get("/patient/{patient_id}", response_model=list[schemas.AssessmentOut])
def list_assessments(patient_id: int,
                     user: models.User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    _authorized_patient(db, patient_id, user)
    return db.query(models.AssessmentRecord).filter(
        models.AssessmentRecord.patient_id == patient_id).order_by(
        models.AssessmentRecord.assessment_date).all()


@router.get("/patient/{patient_id}/trends", response_model=schemas.PatientTrends)
def get_trends(patient_id: int,
               user: models.User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Time series of every metric, for charting."""
    _authorized_patient(db, patient_id, user)
    records = db.query(models.AssessmentRecord).filter(
        models.AssessmentRecord.patient_id == patient_id).order_by(
        models.AssessmentRecord.assessment_date).all()
    series = {m: [] for m in TREND_METRICS}
    series["composite_score"] = []  # 综合恢复指数（归一化加权均值）
    for r in records:
        for m in TREND_METRICS:
            val = getattr(r, m)
            if val is not None:
                series[m].append(schemas.TrendPoint(date=r.assessment_date,
                                                    value=val))
        c = composite_score(r)
        if c is not None:
            series["composite_score"].append(
                schemas.TrendPoint(date=r.assessment_date, value=c))
    return schemas.PatientTrends(patient_id=patient_id, metrics=series)


@router.get("/patient/{patient_id}/insights", response_model=schemas.InsightOut)
def get_insights(patient_id: int,
                 user: models.User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Rule-based risk alerts: two consecutive weeks of decline on any metric."""
    _authorized_patient(db, patient_id, user)
    records = db.query(models.AssessmentRecord).filter(
        models.AssessmentRecord.patient_id == patient_id).order_by(
        models.AssessmentRecord.assessment_date).all()

    def worst_pair(metric: str):
        vals = [(r.assessment_date, getattr(r, metric))
                for r in records if getattr(r, metric) is not None]
        if len(vals) < 2:
            return None
        latest = vals[-1]
        prev = vals[-2]
        # weeks between the two most recent points
        gap_days = (latest[0] - prev[0]).days
        delta = latest[1] - prev[1]
        if metric == "pain_score":
            # 疼痛 NRS：整数 0-10，变化 < MCID(2分) 无统计学意义，不触发风险
            declining = delta >= PAIN_MCID
        else:
            declining = delta < 0
        return (declining, abs(delta), gap_days, latest, prev)

    labels = {
        "pain_score": "疼痛评分", "range_of_motion": "关节活动度",
        "muscle_strength": "肌力评分", "balance_score": "平衡能力",
        "walking_distance": "步行距离", "adl_score": "日常生活能力",
        "training_completion": "训练完成率",
    }
    messages, risk_any, worst = [], False, "normal"
    for m in TREND_METRICS:
        info = worst_pair(m)
        if not info:
            continue
        declining, delta, gap_days, latest, prev = info
        if declining and gap_days <= 21:  # two assessments within ~3 weeks
            risk_any = True
            worst = "high"
            mcid_note = f"（NRS 上升≥{PAIN_MCID:.0f}分，超过最小临床意义变化 MCID）" \
                if m == "pain_score" else ""
            direction = "上升" if m == "pain_score" else "下降"
            # 整数量表用整数显示（如 "2" 而非 "2.0"）
            delta_str = f"{delta:g}"
            messages.append(
                f"{labels.get(m, m)} 较上次{direction} {delta_str} "
                f"（{prev[0]} → {latest[0]}）{mcid_note}，连续下降提示进度风险。")
    if not risk_any:
        messages.append("近期各评估指标未出现连续两周下降，进展正常。")
    return schemas.InsightOut(patient_id=patient_id, risk_flag=risk_any,
                              risk_level=worst, messages=messages)


@router.post("", response_model=schemas.AssessmentOut, status_code=201)
def create_assessment(body: schemas.AssessmentCreate,
                      user: models.User = Depends(require_role("therapist", "admin")),
                      db: Session = Depends(get_db)):
    _authorized_patient(db, body.patient_id, user)
    data = body.model_dump(exclude={"training_completion"})
    rec = models.AssessmentRecord(
        **data,
        # 训练完成率不接受手工录入，由当周打卡自动计算
        training_completion=week_completion(db, body.patient_id,
                                            body.assessment_date))
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.patch("/{assessment_id}", response_model=schemas.AssessmentOut)
def update_assessment(assessment_id: int, body: schemas.AssessmentUpdate,
                      user: models.User = Depends(require_role("therapist", "admin")),
                      db: Session = Depends(get_db)):
    rec = db.get(models.AssessmentRecord, assessment_id)
    if rec is None:
        raise HTTPException(404, "评估记录不存在")
    _authorized_patient(db, rec.patient_id, user)
    for k, v in body.model_dump(exclude_unset=True,
                                exclude={"training_completion"}).items():
        setattr(rec, k, v)
    # 即使更改了评估日期，完成率仍按评估日期所在周自动重算
    rec.training_completion = week_completion(db, rec.patient_id,
                                              rec.assessment_date)
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: int,
                      user: models.User = Depends(require_role("therapist", "admin")),
                      db: Session = Depends(get_db)):
    rec = db.get(models.AssessmentRecord, assessment_id)
    if rec is None:
        raise HTTPException(404, "评估记录不存在")
    _authorized_patient(db, rec.patient_id, user)
    db.delete(rec)
    db.commit()
    return None