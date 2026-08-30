# API 接口文档

> 基地址：`http://127.0.0.1:8000/api`
> 认证：除登录/注册/健康检查外，所有接口需携带请求头 `Authorization: Bearer <access_token>`。
> 交互式调试：启动后端后访问 http://127.0.0.1:8000/docs (Swagger UI)

---

## 通用约定

**角色权限标记**：
| 标记 | 含义 |
|---|---|
| 🔓 公开 | 无需登录 |
| 👤 登录 | 任意已登录用户（再按数据归属过滤） |
| 🩺 治疗师+ | admin 或 therapist |
| 🛡️ 角色校验后 | 在角色基础上执行行级数据隔离 |

**响应格式**：成功返回 JSON（`204` 无 body）；失败返回 `{"detail": "..."}`。

**状态码**：`200` 成功 · `201` 创建 · `204` 删除 · `400` 参数错误 · `401` 未认证 · `403` 无权限 · `404` 不存在 · `422` 校验失败。

---

## 1. 认证 Auth

### POST `/auth/register` — 注册 🔓

请求（JSON）：
```json
{
  "username": "li.new",
  "password": "secret123",
  "display_name": "李新",
  "role": "therapist"
}
```
- `role` 仅允许 `therapist` / `patient`（管理员账号由种子数据提供）；
- 注册 `therapist` 时自动创建治疗师档案；注册 `patient` 时不绑定档案（可后续由治疗师分配）。

响应 `201`：
```json
{
  "id": 12, "username": "li.new", "role": "therapist",
  "display_name": "李新", "is_active": true
}
```

### POST `/auth/login` — 登录 🔓
表单（application/x-www-form-urlencoded，OAuth2 规范）：
```
username=admin&password=admin123
```
响应 `200`：
```json
{
  "access_token": "<jwt>", "token_type": "bearer",
  "expires_in": 7200, "role": "admin", "display_name": "系统管理员"
}
```

### GET `/auth/me` — 当前用户 🛋️
响应：`{id, username, role, display_name, therapist_id|null, patient_id|null, is_active}`

---

## 2. 用户管理 Users（admin）

### GET `/users` — 用户列表
响应 `200`：用户对象数组（含 `role/display_name/is_active/created_at`）。

### PATCH `/users/{id}` — 修改用户
```json
{ "is_active": false }                // 禁用/启用
{ "password": "newpass123" }          // 重置密码
{ "display_name": "新名字" }
```

### GET `/therapists` — 治疗师列表（下拉选项用）
响应：`[{id, user_id, display_name, specialty, years_experience}]`

---

## 3. 患者 Patients

### GET `/patients` — 列表（按角色隔离）🛡️
| 角色 | 结果 |
|---|---|
| patient | 仅自己的档案（若已绑定账号） |
| therapist | 仅自己负责的患者 |
| admin | 全部 |

响应元素：
```json
{
  "id": 1, "name": "张伟", "age": 62, "gender": "male",
  "diagnosis": "左膝骨性关节炎（TKA 术后）",
  "treatment_stage": "恢复期",
  "long_term_goal": "术后3个月能独立平路步行1公里、独立上下楼",
  "short_term_goal": "2周内无痛完成床边坐-站转移，室内步行200米",
  "initial_assessment": "疼痛 7/10，屈曲 68°",
  "admission_date": "2026-06-15",
  "therapist_id": 1, "therapist_name": "王敏",
  "user_id": 3,
  "patient_username": "zhang.wei"
}
```
> 康复目标要求**可观察的功能性表述**（如"独立上下楼梯"），而非结构性参数（如"屈曲 120°"）；分长期/短期两档。

### POST `/patients` — 新建档案 🧑（patient 禁止）
```json
{
  "name": "刘洋", "age": 55, "gender": "female",
  "diagnosis": "脑卒中（右侧偏瘫）", "treatment_stage": "恢复期",
  "long_term_goal": "3 个月内独立步行 400m、独立完成如厕",
  "short_term_goal": "2 周内借助助行器室内步行 50m",
  "initial_assessment": "Brunnstrom 上肢 IV 期",
  "admission_date": "2026-08-01", "therapist_id": 1
}
```

### GET `/patients/{id}` — 详情 🛡️

### PATCH `/patients/{id}` — 更新 🧑
可更新字段同上；`therapist_id` 仅 admin 或本人（therapist）可改。

### DELETE `/patients/{id}` — 删除 🧑（级联清理计划/评估/打卡/预测）

---

## 4. 康复计划 + 动作 Exercises

### GET `/patients/{pid}/plans` — 某患者计划列表 🛡️
### POST `/patients/{pid}/plans` — 新建计划 🧑
```json
{
  "title": "TKA 术后 8 周康复计划",
  "start_date": "2026-06-20", "end_date": "2026-08-15",
  "frequency_per_week": 5, "duration_minutes": 30
}
```
响应 `201`：计划对象（含 `id`）。

### GET / PATCH / DELETE `/plans/{id}` — 计划详情 / 更新 / 删除 🧑
`status` 取值：`active | paused | completed`。PATCH 示例：
```json
{ "status": "paused" }
```

### GET `/plans/{id}/exercises` — 计划内动作列表 🛡️
### POST `/plans/{id}/exercises` — 添加动作 🧑
```json
{
  "name": "直腿抬高", "sets": 3, "reps": 10,
  "duration_min": 5, "target_metric": "range_of_motion"
}
```
### DELETE `/plans/{id}/exercises/{exid}` — 删除动作 🧑

---

## 5. 训练打卡 Training Logs

### POST `/training-logs` — 患者打卡 👤（仅患者本人）
```json
{
  "patient_id": 1, "plan_id": 2, "exercise_id": 5,
  "log_date": "2026-08-28", "completed": true,
  "sets_done": 3, "reps_done": 10, "duration_min": 5,
  "week_number": 9, "note": "今天状态不错"
}
```
响应 `201` 打卡记录（`backend.service` 自动生成周次）。

---

## 6. 评估记录 Assessments

### GET `/patients/{pid}/assessments` — 评估列表 🛡️
响应：`[{id, assessment_date, phase, pain_score, range_of_motion, ...}]`（按日期升序）

### POST `/patients/{pid}/assessments` — 录入评估 🧑
```json
{
  "assessment_date": "2026-08-28", "phase": "第9周",
  "pain_score": 3, "range_of_motion": 118,
  "muscle_strength": 4, "balance_score": 50,
  "walking_distance": 620, "adl_score": 82
}
```
> - **全部 7 项评估指标均为临床整数量表**（提交小数返回 422）：
>   `pain_score` 0–10 NRS、`range_of_motion` 0–180 测角器读数、`muscle_strength` 0–5 MMT 徒手肌力分级、`balance_score` 0–56 Berg 平衡量表、`walking_distance` 0–1000 米 6MWT、`adl_score` 0–100 Barthel 巴氏指数；
> - `walking_distance`（6MWT）为次极量运动测试，**TKA 等术后早期（前约 4 周）不建议执行**，对应期可传 `null`，改用 10m 步行/室内步行记录；
> - `training_completion` **不接受手工提交**：由当周（自然周年一~周日）训练打卡自动计算（已完成打卡数 ÷ 当周总打卡数 ×100%），当周无打卡则为 `null`；
> - 评估人自动记录为当前登录用户（`assessor_id`）。

### GET `/assessments/patient/{pid}/trends` — 8 项指标趋势 🛡️
响应：
```json
{
  "patient_id": 1,
  "metrics": {
    "composite_score": [{"date": "2026-07-01", "value": 71.9}, ...],
    "pain_score":      [{"date": "2026-07-01", "value": 7}, ...],
    "range_of_motion": [...], "muscle_strength": [...],
    "balance_score": [...], "walking_distance": [...],
    "adl_score": [...], "training_completion": [...]
  },
  "latest": { "…": "最新一次评估的指标快照" }
}
```
> `composite_score` 为**综合恢复指数**（0–100），由后端计算：各**已记录**指标按量表范围归一化（正向 `(值−下限)/(上限−下限)`，疼痛反向 `(上限−值)/(上限−下限)`）后取平均 ×100；缺失指标不计入。归一化范围：NRS 0-10、ROM 0-180°、MMT 0-5、Berg 0-56、6MWT 0-1000m、Barthel 0-100、完成率 0-100%。

### GET `/assessments/patient/{pid}/insights` — 风险提醒分析 🛡️
响应：
```json
{
  "patient_id": 1, "risk_flag": true, "risk_level": "medium",
  "messages": [
    "疼痛评分连续上升（5 → 7，NRS 上升 2.0 分，超过最小临床意义变化 MCID），建议调整训练强度并复查",
    "训练完成率 62% 低于阈值 70%，依从性不足，建议电话随访",
    "ROM 连续 2 次下降（118 → 112°），进展受阻，建议复查"
  ]
}
```
规则：
- **连续恶化**：同一指标最近两次评估（21 天内）趋势恶化 → 风险；其中疼痛评分变化 **≥2 分（MCID）** 才触发（NRS <2 分变化无统计学意义，不误报警）；
- **依从性**：`training_completion < 70` → 提醒（完成率由打卡自动计算）；
- 无风险则 `risk_flag: false`。

### PATCH / DELETE `/assessments/{id}` — 修改/删除评估 🧑

---

## 7. 恢复预测 Predictions（scikit-learn）

### POST `/predictions/patient/{pid}?weeks_ahead=4` — 运行预测 🧑
对 7 个指标分别训练 **LinearRegression（以周次为自变量）**，外推 `weeks_ahead`（默认 4，允许 1–12）周。

响应 `200`：
```json
[
  {
    "id": 31, "patient_id": 1, "metric": "pain_score",
    "predicted_at": "2026-08-28", "target_date": "2026-09-25",
    "current_value": 2.5, "predicted_value": 0.8,
    "slope_per_week": -0.42, "r2_score": 0.91,
    "risk_level": "low",
    "model": "LinearRegression (sklearn)",
    "message": "按当前趋势，疼痛评分 4 周后预计 0.8（每周下降 0.42，模型拟合 R²=0.91）"
  },
  { "metric": "range_of_motion", "predicted_value": 131.2, "risk_level": "medium", ... }
]
```
- `predicted_value` 已裁剪到临床合理区间（如疼痛 0-10、ROM ≤180、Berg ≤56、Barthel ≤100、6MWT ≤1000m）；**全部整数量表（NRS/ROM/MMT/Berg/6MWT/Barthel）预测取整**，与临床整数口径一致；
- `risk_level`：`low`（好转中）/ `medium`（停滞或轻度下降）/ `high`（明显恶化）。

### GET `/predictions/patient/{pid}` — 历史预测记录 🛡️

---

## 8. 数据导出 Export

### GET `/export/patient/{pid}/assessments` — 评估 CSV 🧑
流式返回 `text/csv`，带 BOM（Excel 中文兼容），列：评估日期、阶段、疼痛、ROM、肌力、平衡、步行距离、ADL、完成率。

### GET `/export/patient/{pid}/training` — 训练记录 CSV 🧑
列：日期、周次、动作、完成、组数、次数、时长、备注。

---

## 9. 统计 Stats

### GET `/stats/overview` — 全局概览 🧑（admin / therapist）
响应：
```json
{
  "total_patients": 8, "total_assessments": 64,
  "total_plans": 8, "total_training_logs": 200,
  "avg_completion": 83.5, "risk_patients": 2
}
```
- admin 统计全系统；therapist 统计本人负责的患者。

---

## 10. 健康检查

### GET `/health` — 🔓
`{"status": "ok", "app": "Rehab Progress Management System API", "time": "…"}`