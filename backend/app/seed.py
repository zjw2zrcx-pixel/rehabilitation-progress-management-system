# -*- coding: utf-8 -*-
"""Seed the database with realistic simulated rehabilitation data.

All metrics follow published clinical reference ranges
(see refdata/ notes in the README):
    - pain NRS 0-10
    - ROM (knee flexion) target ~120-145 deg for TKA
    - muscle strength MMT 0-5
    - balance Berg 0-56 (>=41 low fall risk, <=20 wheelchair-bound)
    - 6MWT walk distance: 400-700 m normal for healthy adults
    - ADL Barthel 0-100 (independent >=60)
    - training completion 0-100 %

Two patients (张伟, 王芳) have a declining final segment so risk alerts
and prediction demonstrations are meaningful.

Idempotent: drops & recreates all tables each run.
"""
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session  # noqa: E402

from app import models  # noqa: E402
from app.auth import hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402

random.seed(20260711)


def days(n: int) -> timedelta:
    return timedelta(days=n)


# ---------------------------------------------------------------- users
def add_user(db: Session, username: str, password: str, role: str,
             full_name: str, email: str = "") -> models.User:
    u = models.User(username=username, password_hash=hash_password(password),
                    role=role, full_name=full_name, email=email or None)
    db.add(u)
    db.flush()
    return u


def seed_users(db: Session):
    """1 admin, 3 therapists, 8 patients (each with a login account)."""
    admin = add_user(db, "admin", "admin123", "admin", "系统管理员",
                     "admin@rehab.demo")
    therapists = []
    for uname, pw, name, spec in [
        ("wang.therapist", "therapist123", "王敏", "骨科康复"),
        ("li.therapist", "therapist123", "李强", "神经康复"),
        ("chen.therapist", "therapist123", "陈静", "运动康复"),
    ]:
        u = add_user(db, uname, pw, "therapist", name,
                     f"{uname.split('.')[0]}@rehab.demo")
        t = models.Therapist(user_id=u.id, specialization=spec,
                             license_no=f"THR{1000 + u.id}")
        db.add(t)
        db.flush()
        therapists.append(t)

    patients = [
        # (username, password, full_name, therapist_idx, profile dict)
        # 康复目标采用"功能性"表述（可观察的功能行为结果），并区分长期/短期
        ("zhang.wei", "patient123", "张伟", 0, {
            "name": "张伟", "age": 63, "gender": "male",
            "diagnosis": "膝骨性关节炎（全膝关节置换术后）",
            "long_term_goal": "术后3个月能独立平路步行1公里、上下楼梯各5级，无痛完成买菜、家务等日常活动",
            "short_term_goal": "2周内无痛完成床边坐-站转移，室内步行200米不需助行器",
            "initial_assessment": "疼痛7/10，屈曲68°，Barthel 50，Berg 42，6MWT 369m",
            "treatment_stage": "恢复期"}),
        ("li.na", "patient123", "李娜", 1, {
            "name": "李娜", "age": 58, "gender": "female",
            "diagnosis": "脑卒中（右侧偏瘫）",
            "long_term_goal": "6个月内恢复社区内独立步行，独立完成穿脱衣物、如厕、进食等日常活动",
            "short_term_goal": "2周内床边坐位平衡维持30分钟，监护下完成床-椅转移",
            "initial_assessment": "FMA上肢22，Berg 28，Barthel 45",
            "treatment_stage": "恢复期"}),
        ("wang.fang", "patient123", "王芳", 0, {
            "name": "王芳", "age": 47, "gender": "female",
            "diagnosis": "肩袖损伤术后",
            "long_term_goal": "3个月后无痛完成日常生活（提取2kg物品、够到衣柜上层、搓洗晾衣）",
            "short_term_goal": "2周内患侧手抬过头顶、梳头无痛，夜间可侧卧",
            "initial_assessment": "前屈90°，外展80°，疼痛5/10",
            "treatment_stage": "恢复期"}),
        ("chen.hao", "patient123", "陈昊", 2, {
            "name": "陈昊", "age": 34, "gender": "male",
            "diagnosis": "前交叉韧带重建术后",
            "long_term_goal": "9个月后恢复跑步、变向与跳跃，重返球场并完成竞技水平动作",
            "short_term_goal": "2周内恢复正常步态（无跛行），可无痛下蹲",
            "initial_assessment": "屈曲95°，肌力3/5，6MWT 420m",
            "treatment_stage": "恢复期"}),
        ("sun.jie", "patient123", "孙洁", 1, {
            "name": "孙洁", "age": 71, "gender": "female",
            "diagnosis": "髋部骨折内固定术后",
            "long_term_goal": "3个月后独立下床并步行至社区小店购物，如厕、沐浴自理",
            "short_term_goal": "1周内在助行器辅助下完成床边站立与床边步行50米",
            "initial_assessment": "Berg 38，6MWT 260m，Barthel 60",
            "treatment_stage": "早期"}),
        ("zhao.lei", "patient123", "赵磊", 2, {
            "name": "赵磊", "age": 26, "gender": "male",
            "diagnosis": "肩关节不稳（复发性脱位）术后",
            "long_term_goal": "4个月后恢复无痛、无再脱位的投掷与游泳等运动",
            "short_term_goal": "2周内患侧手臂无痛完成前屈过头与肩水平伸展",
            "initial_assessment": "外展90°，疼痛4/10",
            "treatment_stage": "中期"}),
        ("wang.jing", "patient123", "王晶", 0, {
            "name": "王晶", "age": 52, "gender": "female",
            "diagnosis": "腰椎间盘突出症（保守治疗）",
            "long_term_goal": "3个月后恢复久坐办公1小时、弯腰取物、驾驶与弯腰做家务无明显疼痛",
            "short_term_goal": "2周内疼痛减轻至少2分，能完成10分钟无痛慢走",
            "initial_assessment": "疼痛6/10，直腿抬高60°",
            "treatment_stage": "早期"}),
        ("liu.lei", "patient123", "刘雷", 2, {
            "name": "刘雷", "age": 45, "gender": "male",
            "diagnosis": "跟腱断裂修复术后",
            "long_term_goal": "6个月后恢复跑步与跳跃能力，可重返球类运动",
            "short_term_goal": "2周内无痛步行30分钟，双足提踵动作完成度达50%",
            "initial_assessment": "踝背屈15°，疼痛3/10",
            "treatment_stage": "恢复期"}),
    ]
    patient_rows = []
    for uname, pw, name, tidx, profile in patients:
        u = add_user(db, uname, pw, "patient", name, f"{uname}@rehab.demo")
        p = models.Patient(user_id=u.id, therapist_id=therapists[tidx].id,
                           **profile)
        db.add(p)
        db.flush()
        patient_rows.append((therapists[tidx], p))
    return admin, therapists, patient_rows


# ------------------------------------------------------------- exercises
EXERCISE_LIBRARY = {
    "knee": [
        ("直腿抬高 (Straight Leg Raise)", 3, 10, 5,
         "仰卧位，绷紧大腿前侧肌群后缓慢抬起，膝盖伸直，空中保持2秒",
         "muscle_strength"),
        ("脚跟滑动 (Heel Slide)", 3, 12, 5,
         "仰卧屈膝，脚跟沿床面向臀部滑动，最大屈曲处保持5秒", "range_of_motion"),
        ("踝泵练习 (Ankle Pumps)", 3, 15, 5,
         "踝关节最大背屈/跖屈往复活动，促进静脉回流", "adl_score"),
        ("坐位屈膝 (Seated Knee Flexion)", 3, 10, 5,
         "坐位，患足向后滑动尽量屈膝，恢复活动度", "range_of_motion"),
        ("股四头肌静力收缩 (Quad Sets)", 2, 15, 5,
         "膝下压床面使股四头肌收缩，保持5秒", "muscle_strength"),
    ],
    "stroke": [
        ("良姿位摆放与肢体被动活动", 2, 10, 10,
         "家属协助患侧肩、肘、腕、髋、膝各关节缓慢被动活动", "range_of_motion"),
        ("床上桥式运动 (Bridging)", 3, 10, 5,
         "仰卧屈膝，臀部抬离床面，训练腰腹与臀肌", "balance_score"),
        ("坐位重心转移 (Sitting Weight Shift)", 3, 10, 5,
         "坐位下重心左右前后转移，保持躯干直立", "balance_score"),
        ("立位平衡训练 (Standing Balance)", 3, 8, 5,
         "扶栏杆站立，逐渐减少支持，双足与单足", "balance_score"),
        ("步行训练 (Gait Training)", 3, 5, 10,
         "平行杠/助行器辅助步行，注意步幅与对线", "walking_distance"),
    ],
    "shoulder": [
        ("钟摆运动 (Pendulum)", 2, 10, 5,
         "弯腰前倾，患臂自然下垂做钟摆样摆动", "range_of_motion"),
        ("墙面爬行 (Wall Walking)", 3, 10, 5,
         "手指沿墙向上爬行，逐渐增加前屈角度", "range_of_motion"),
        ("肩胛回缩 (Scapular Set)", 3, 12, 5,
         "挺胸收背，肩胛骨向后下方滑动保持", "muscle_strength"),
        ("弹力带外旋 (Band External Rotation)", 3, 12, 8,
         "肘部屈曲90°，前臂水平，弹力带抗阻外旋", "muscle_strength"),
        ("棍棒前屈 (Cane Flexion)", 3, 12, 5,
         "双手持棍，借助健侧引导患侧前屈上举", "range_of_motion"),
    ],
    "core": [
        ("麦肯杰伸展 (McKenzie Extension)", 3, 10, 5,
         "俯卧肘撑转手掌撑，缓慢后伸腰部", "pain_score"),
        ("小燕飞 (Superman)", 3, 10, 5,
         "俯卧位同时抬起对侧手脚，保持3秒", "muscle_strength"),
        ("平板支撑 (Plank)", 3, 5, 3,
         "肘撑俯卧，身体成一直线保持30-60秒", "balance_score"),
        ("鸟狗式 (Bird Dog)", 3, 8, 5,
         "肘膝跪位，同时伸展对侧手足，保持平衡", "balance_score"),
    ],
    "ankle": [
        ("踝泵练习 (Ankle Pumps)", 3, 15, 5,
         "主动踝背屈/跖屈往复，无负重进行", "range_of_motion"),
        ("提踵练习 (Calf Raises)", 3, 12, 5,
         "扶墙站立，缓慢提踵后缓慢回落", "muscle_strength"),
        ("单腿平衡 (Single Leg Balance)", 2, 5, 3,
         "单手扶墙单腿站立30秒，逐渐过渡到无支撑", "balance_score"),
        ("弹力带背屈 (Theraband Dorsiflexion)", 3, 12, 5,
         "坐位，弹力带助力踝背屈抗阻", "muscle_strength"),
    ],
}

TODAY = date(2026, 8, 28)


def _plan_key(diagnosis: str) -> str:
    if "膝" in diagnosis:
        return "knee"
    if "卒" in diagnosis:
        return "stroke"
    if "肩" in diagnosis:
        return "shoulder"
    if "椎" in diagnosis:
        return "core"
    return "ankle"


def build_plan(db: Session, patient: models.Patient) -> models.RehabPlan:
    key = _plan_key(patient.diagnosis)
    exercises = EXERCISE_LIBRARY[key]
    titles = {
        "knee": "膝关节置换围手术期康复计划",
        "stroke": "脑卒中早期康复计划",
        "shoulder": "肩关节术后康复计划",
        "core": "腰椎核心康复计划",
        "ankle": "跟腱术后康复计划",
    }
    plan = models.RehabPlan(
        patient_id=patient.id,
        title=titles[key],
        description="基于循证指南的阶段性康复方案，每周5次，每次30-40分钟",
        start_date=TODAY - days(28),
        end_date=TODAY + days(56),
        status="进行中",
        frequency_per_week=5,
        duration_minutes=35,
        notes="训练过程中若疼痛>4/10 应暂停并及时联系治疗师",
    )
    db.add(plan)
    db.flush()
    for name, sets, reps, dur, desc, metric in exercises[:5]:
        db.add(models.Exercise(plan_id=plan.id, name=name, sets=sets, reps=reps,
                               duration_min=dur, description=desc,
                               target_metric=metric))
    db.flush()  # 立即落库，保证后续 seed_training_logs 能查询到动作
    return plan


# --------------------------------------------------------- assessments
def seed_assessments(db: Session, patient: models.Patient, n_weeks: int = 8):
    """Weekly assessment records with realistic recovery trajectories.

    张伟 (TKA) & 王芳 (shoulder): the last two weeks decline → risk alerts.
    刘雷 (ankle): plateaus at the end.
    """
    rng = random.Random(patient.id * 7 + 3)
    start = TODAY - days(n_weeks * 7)
    diagnosis = patient.diagnosis
    key = _plan_key(diagnosis)

    # baseline per diagnosis: (pain, rom, strength, balance, walk, adl)
    baselines = {
        "knee": (6.5, 70, 2.6, 42, 360, 50),
        "stroke": (4.0, 60, 2.0, 28, 180, 45),
        "shoulder": (5.0, 90, 3.0, 48, 380, 55),
        "core": (6.0, 100, 3.0, 45, 420, 60),
        "ankle": (3.5, 105, 3.0, 50, 430, 65),
    }
    # target improvements after 8 weeks (relative deltas)
    # balance 增量按 Berg 量表实际可达幅度（8 周 +10 分左右已属显著进展），
    # 避免数值瞬间顶满量表上限的失真曲线
    targets = {
        "knee": (-5.5, 45, 1.8, 12, 4.5, 30),
        "stroke": (-2.5, 55, 1.6, 14, 3.5, 35),
        "shoulder": (-3.0, 45, 1.4, 6, 1.0, 25),
        "core": (-3.5, 20, 1.0, 5, 1.0, 20),
        "ankle": (-2.0, 10, 1.2, 3, 0.8, 10),
    }

    for i in range(n_weeks):
        t = i / (n_weeks - 1)
        date_ = start + days(7 * i)

        def curve(base, delta):
            val = base + delta * t + rng.uniform(-0.8, 0.8)
            return max(val, 0)

        # 全部为临床整数量表：NRS 0-10 / 测角器 ° / MMT 0-5 / Berg 0-56 / 6MWT m / Barthel 0-100
        pain = int(round(curve(baselines[key][0], targets[key][0])))
        rom = int(round(baselines[key][1] + targets[key][1] * t))
        strength = int(min(5.0, round(baselines[key][2] + targets[key][2] * t)))
        balance = int(min(56, round(baselines[key][3] + targets[key][3] * t)))
        walk = int(round(baselines[key][4] + targets[key][4] * t))
        adl = int(min(100, round(baselines[key][5] + targets[key][5] * t)))
        # 康复合理性：6MWT 属次极量运动测试，TKA/脑卒中术后早期（第1-2周，
        # 多处于卧床/助行器阶段）不执行；第 3 周起恢复 6MWT 记录
        if key in ("knee", "stroke") and i < 2:
            walk = None
        # 训练完成率：由当周训练打卡自动计算（completed / 当周总打卡）
        completion = _week_completion(db, patient.id, date_)

        # ---- risk episodes (progress risk demo) ----
        if patient.name in ("张伟", "王芳") and i in (n_weeks - 3, n_weeks - 2):
            pain = min(10, pain + 2)   # 上升≥ MCID(2分) 触发风险
            rom = max(30, rom - 8)
        if patient.name == "刘雷" and i >= n_weeks - 2:
            rom = max(0, rom - 2)

        record = models.AssessmentRecord(
            patient_id=patient.id,
            assessment_date=date_,
            phase=f"第{i+1}周",
            pain_score=pain,
            range_of_motion=rom,
            rom_joint=_rom_joint(key),
            muscle_strength=strength,
            balance_score=balance,
            walking_distance=walk,
            adl_score=adl,
            training_completion=completion,
            notes="",
        )
        db.add(record)


def _week_completion(db: Session, patient_id: int, on_date: date):
    """按 ISO 自然周统计训练完成率：当周 completed=True 打卡数 / 当周总打卡数 ×100。

    与后端评估记录自动计算口径一致（见 routers/assessments.py week_completion）。
    当周无打卡记录时返回 None。
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


def _rom_joint(key: str) -> str:
    return {"knee": "knee_flexion", "shoulder": "shoulder_flexion",
            "ankle": "ankle_flexion"}.get(key, "knee_flexion")


# ---------------------------------------------------------- training logs
def seed_training_logs(db: Session, patient: models.Patient, plan: models.RehabPlan,
                       n_weeks: int = 6):
    rng = random.Random(patient.id * 13)
    start = TODAY - days(n_weeks * 7)
    risk = patient.name in ("张伟", "王芳")
    exercises = db.query(models.Exercise).filter(
        models.Exercise.plan_id == plan.id).all()
    for w in range(n_weeks):
        for day_offset in range(5):  # Mon-Fri
            d = start + days(w * 7 + day_offset)
            if d > TODAY:
                continue
            # completion probability lower for risk patients at the end
            if risk and w >= n_weeks - 3:
                done = rng.random() < 0.45
            else:
                done = rng.random() < 0.75
            exercise = rng.choice(exercises) if exercises else None
            if exercise is None:
                continue
            db.add(models.TrainingLog(
                patient_id=patient.id,
                plan_id=plan.id,
                exercise_id=exercise.id,
                log_date=d,
                completed=done,
                sets_done=exercise.sets if done else None,
                reps_done=exercise.reps if done else None,
                duration_min=exercise.duration_min if done else None,
                note="按时完成" if done else "未完成（疼痛/疲劳）",
            ))
    # session 的 autoflush=False：显式 flush，否则后续 _week_completion
    # 查询看不到这批 pending 的日志
    db.flush()


# ------------------------------------------------------------- main
def main():
    print("Recreating database tables ...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin, therapists, patient_rows = seed_users(db)
        for _, patient in patient_rows:
            plan = build_plan(db, patient)
            # 先建训练打卡（8周），评估的"训练完成率"由打卡按周自动计算
            seed_training_logs(db, patient, plan, n_weeks=8)
            seed_assessments(db, patient)
        db.commit()
        print(f"Seeded: admin={admin.username}, therapists={len(therapists)}, "
              f"patients={len(patient_rows)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()