# -*- coding: utf-8 -*-
"""End-to-end smoke test for the Rehab Progress Management System API.

Covers the three roles and the full CRUD / chart / prediction / export flows.
Requires the backend running on http://127.0.0.1:8000 (seeded).
"""
import json
import urllib.parse
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000/api"
passed = []
failed = []


def call(method, path, token=None, body=None, form=None):
    url = BASE + path
    data = None
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if form:
        data = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip().startswith(("{", "[")) else raw)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


def check(name, ok, detail=""):
    if ok:
        passed.append(name)
        print(f"  PASS  {name}")
    else:
        failed.append(name)
        print(f"  FAIL  {name}  {detail[:160]}")


# ---------------------------------------------------------------- login
tokens = {}
for uname, pw, role in [
    ("admin", "admin123", "admin"),
    ("wang.therapist", "therapist123", "therapist"),
    ("zhang.wei", "patient123", "patient"),
]:
    st, data = call("POST", "/auth/login", form={"username": uname, "password": pw})
    check(f"login {uname}", st == 200 and data.get("role") == role, str(data)[:80])
    tokens[role] = data["access_token"]

print("\n-- 角色权限 --")
st, _ = call("GET", "/users", token=tokens["patient"])
check("患者禁止访问用户管理", st in (401, 403), f"got {st}")
st, _ = call("GET", "/users", token=tokens["therapist"])
check("治疗师禁止访问用户管理", st in (401, 403), f"got {st}")
st, data = call("GET", "/users", token=tokens["admin"])
check("管理员可访问用户管理", st == 200 and len(data) >= 5, f"got {st}")

st, data = call("GET", "/patients", token=tokens["patient"])
check("患者仅见自己档案", st == 200 and len(data) == 1 and data[0]["name"] == "张伟",
      str(data)[:120])
st, data = call("GET", "/patients", token=tokens["therapist"])
check("治疗师仅见负责患者", st == 200 and len(data) == 3, f"got {len(data)}")

print(":-- 患者 CRUD --")
st, data = call("POST", "/patients", token=tokens["patient"],
                body={"name": "x", "age": 30, "gender": "male", "diagnosis": "x"})
check("患者禁止建档", st in (401, 403), f"got {st}")
st, new = call("POST", "/patients", token=tokens["therapist"], body={
    "name": "联调测试", "age": 40, "gender": "male", "diagnosis": "测试诊断",
    "therapist_id": 1, "treatment_stage": "恢复期", "admission_date": "2026-08-01"})
check("治疗师创建患者", st == 201 and new.get("id"), str(new)[:120])
new_id = new.get("id")
st, _ = call("PATCH", f"/patients/{new_id}", token=tokens["therapist"],
             body={"treatment_stage": "后期"})
check("更新患者", st == 200, f"got {st}")
st, _ = call("DELETE", f"/patients/{new_id}", token=tokens["therapist"])
check("删除患者", st == 204 or st == 200, f"got {st}")

print("-- 康复计划 + 动作 --")
st, plan = call("POST", "/plans", token=tokens["therapist"], body={
    "patient_id": 1, "title": "联调计划", "start_date": "2026-08-01",
    "end_date": "2026-10-01", "frequency_per_week": 5, "duration_minutes": 30})
check("创建计划", st == 201 and plan.get("id"), str(plan)[:120])
plan_id = plan.get("id")
st, ex = call("POST", f"/plans/{plan_id}/exercises", token=tokens["therapist"], body={
    "name": "测试动作", "sets": 3, "reps": 10, "duration_min": 5,
    "target_metric": "range_of_motion"})
check("添加训练动作", st == 201 and ex.get("id"), str(ex)[:120])

print("-- 患者训练打卡 --")
st, log = call("POST", "/training-logs", token=tokens["patient"], body={
    "patient_id": 1, "plan_id": plan_id, "exercise_id": ex["id"],
    "log_date": "2026-08-28", "completed": True, "sets_done": 3,
    "reps_done": 10, "duration_min": 5, "note": "打卡"})
check("患者记录训练", st == 201, str(log)[:120])

print("-- 评估 + 趋势 --")
st, _ = call("POST", "/assessments", token=tokens["therapist"], body={
    "patient_id": 1, "assessment_date": "2026-08-28", "phase": "第9周",
    "pain_score": 2, "range_of_motion": 120, "muscle_strength": 4,
    "balance_score": 52, "walking_distance": 680, "adl_score": 85})
check("录入评估(全整数量表)", st == 201, f"got {st}")
st, _ = call("POST", "/assessments", token=tokens["therapist"], body={
    "patient_id": 1, "assessment_date": "2026-08-29", "phase": "第9周",
    "pain_score": 2.5})
check("疼痛评分拒绝非整数(422)", st == 422, f"got {st}")
st, _ = call("POST", "/assessments", token=tokens["therapist"], body={
    "patient_id": 1, "assessment_date": "2026-08-29", "phase": "第9周",
    "pain_score": 2, "muscle_strength": 4.5})
check("肌力评分拒绝非整数(422)", st == 422, f"got {st}")
st, trends = call("GET", "/assessments/patient/1/trends", token=tokens["patient"])
check("患者获取趋势", st == 200 and "pain_score" in trends.get("metrics", {}),
      str(trends)[:120])

print("-- 预测 / 风险 / 导出 / 统计 --")
st, preds = call("POST", "/predictions/patient/1?weeks_ahead=4", token=tokens["therapist"])
check("运行 sklearn 预测", st == 200 and len(preds) >= 6, str(preds)[:120])
st, ins = call("GET", "/assessments/patient/1/insights", token=tokens["therapist"])
check("风险提示", st == 200 and "messages" in ins, str(ins)[:120])
st, csv_a = call("GET", "/export/patient/1/assessments", token=tokens["therapist"])
check("导出评估CSV", st == 200 and "assessment_date" in str(csv_a)[:200])
st, csv_t = call("GET", "/export/patient/1/training", token=tokens["therapist"])
check("导出训练CSV", st == 200 and "log_date" in str(csv_t)[:200])
st, ov = call("GET", "/stats/overview", token=tokens["admin"])
check("概览统计(admin)", st == 200 and "total_patients" in ov, str(ov)[:120])

# unauthorized patient hitting another's data
st, _ = call("GET", "/assessments/patient/2/trends", token=tokens["patient"])
check("患者禁止看他人数据", st in (401, 403), f"got {st}")

print(f"\n==== {len(passed)} passed / {len(failed)} failed ====")
if failed:
    print("Failed:", *failed, sep="\n  ")
    raise SystemExit(1)