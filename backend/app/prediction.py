# -*- coding: utf-8 -*-
"""Simple ML module: linear regression forecast + progress-risk rules.

Design principles (matching the requirements):
- 特征设计: 时间 (weeks since first assessment) 为唯一特征，逐指标训练
  一元线性回归 —— 对短时间序列（课程项目）足够且可解释。
- 模型评估: 报告拟合优度 R² 与每周斜率（slope/week），预测值裁剪到
  临床合理范围（如疼痛 0-10、ROM 0-180）。
- 风险提示: 依据"连续两周下降 + 斜率方向"的规则，与 sklearn / numpy
  结果共同输出可解释消息（rule-based reasoning layered on regression）。
"""
from datetime import date

import numpy as np
from sklearn.linear_model import LinearRegression

# 临床合理范围：metric -> (min, max)，用于裁剪预测值与综合指数归一化
# walking_distance 上界 1000m：6MWT 实测极少超过 900m，取 1000 作为合理上限
BOUNDS = {
    "pain_score": (0.0, 10.0),
    "range_of_motion": (0.0, 180.0),
    "muscle_strength": (0.0, 5.0),
    "balance_score": (0.0, 56.0),
    "walking_distance": (0.0, 1000.0),
    "adl_score": (0.0, 100.0),
    "training_completion": (0.0, 100.0),
}

# 临床整数量表：预测结果取整，与临床记录口径一致
INT_METRICS = {"pain_score", "range_of_motion", "muscle_strength",
               "balance_score", "walking_distance", "adl_score"}

# 指标越小越好的集合（疼痛）
LOWER_BETTER = {"pain_score"}

def weeks_since(ref: date, d: date) -> float:
    return (d - ref).days / 7.0


def _trend_signal(values: list[float], lower_better: bool) -> tuple[float, bool, bool]:
    """Return (delta2, is_declining, is_improving).

    "declining" = the metric is moving the WRONG way:
      - lower_better (pain): rising = decline
      - higher-better (ROM/strength/...): falling = decline
    """
    n = len(values)
    if n < 2:
        return 0.0, False, False
    delta = values[-1] - values[-2]
    declining = (delta > 0) if lower_better else (delta < 0)
    improving = (delta < 0) if lower_better else (delta > 0)
    return delta, declining, improving


def predict_metric(points: list[tuple[date, float]],
                   weeks_ahead: int = 4,
                   metric: str = "pain_score") -> dict:
    """Linear-regression forecast of one metric, `weeks_ahead` weeks out.

    points: [(assessment_date, value)] sorted ascending.
    Returns dict: predicted_value, current_value, r2_score, slope_per_week,
    risk_flag, risk_level, message, model.
    """
    if len(points) < 2:
        raise ValueError("至少需要 2 条评估记录才能预测")

    ref = points[0][0]
    xs = np.array([weeks_since(ref, p[0]) for p in points], dtype=float)
    ys = np.array([p[1] for p in points], dtype=float)

    model = LinearRegression()
    model.fit(xs.reshape(-1, 1), ys)

    horizon = xs.max() + weeks_ahead
    raw = float(model.predict(np.array([[horizon]]))[0])

    lo, hi = BOUNDS.get(metric, (0.0, 100.0))
    pred = float(np.clip(raw, lo, hi))
    # 整数量表（NRS/ROM/MMT/Berg/6MWT/Barthel）预测取整，与临床记录口径一致
    if metric in INT_METRICS:
        pred = float(round(pred))
    current = float(ys[-1])
    r2 = float(model.score(xs.reshape(-1, 1), ys))
    slope = float(model.coef_[0])
    slope_percent = slope / max(abs(current), 1e-9) * 100.0

    delta, declining, improving = _trend_signal(ys.tolist(), metric in LOWER_BETTER)

    # ---- 风险分级 ----
    change_word = "上升" if metric in LOWER_BETTER else "下降"
    if declining:
        risk_flag, risk_level = True, "high"
        message = (f"{metric} 连续两周{change_word}（Δ={delta:+g}），"
                   f"存在康复进展风险：建议复查训练负荷、疼痛控制与治疗依从性。")
    elif len(points) >= 3 and improving and slope < 0.05 * max(abs(current), 1):
        risk_flag, risk_level = True, "medium"
        message = f"{metric} 改善缓慢（周斜率 {slope:+.2f}），注意按时执行训练。"
    elif len(points) >= 3 and abs(delta) < 1e-6:
        risk_flag, risk_level = True, "low"
        message = f"{metric} 两周持平，无显著变化，建议观察下周趋势。"
    else:
        risk_flag, risk_level = False, "normal"
        message = f"{metric} 呈改善趋势（周斜率 {slope:+.2f}），继续当前方案。"

    return {
        "metric": metric,
        "model": "LinearRegression (sklearn)",
        "predicted_value": pred,
        "current_value": current,
        "weeks_ahead": weeks_ahead,
        "r2_score": r2,
        "slope_per_week": slope,
        "risk_flag": risk_flag,
        "risk_level": risk_level,
        "message": message,
    }