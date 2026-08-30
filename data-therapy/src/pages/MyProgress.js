import React, { useEffect, useState } from 'react';
import { listPatients, listPlans, listLogs, createLog, errMsg } from '../api';
import { useAuth, useLanguage } from '../context';
import { translateContent } from '../translations';

export default function MyProgress() {
  const { user } = useAuth();
  const { tr, language } = useLanguage();
  const [patient, setPatient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user.role !== 'patient') return;
    listPatients().then(async (r) => {
      if (!r.data.length) return;
      const p = r.data[0];
      setPatient(p);
      const [pl, lg] = await Promise.all([listPlans(p.id), listLogs(p.id)]);
      setPlans(pl.data);
      setLogs(lg.data);
    });
  }, [user.role]);

  if (user.role !== 'patient') {
    return <div className="card"><p>{tr('Please use a patient account to view My Progress.', '请在患者账号中查看我的进度。')}</p></div>;
  }
  if (!patient) return <p className="muted">{tr('Loading...', '加载中…')}</p>;

  const today = new Date().toISOString().slice(0, 10);
  const logToday = async (plan, exercise) => {
    try {
      await createLog({
        patient_id: patient.id,
        plan_id: plan.id,
        exercise_id: exercise.id,
        log_date: today,
        completed: true,
        sets_done: exercise.sets,
        reps_done: exercise.reps,
        duration_min: exercise.duration_min,
        note: '患者端打卡',
      });
      const lg = await listLogs(patient.id);
      setLogs(lg.data);
      setMsg(tr('✓ Training recorded', '✓ 训练已记录'));
      setTimeout(() => setMsg(''), 2000);
    } catch (e) { setMsg(errMsg(e)); }
  };

  const todayDones = new Set(
    logs.filter((l) => l.log_date === today && l.completed).map((l) => l.exercise_id)
  );

  return (
    <div className="stack">
      <div className="page-head">
        <h2>{tr('My Training Tasks', '我的训练任务')}</h2>
        {msg && <span className="alert alert-success">{msg}</span>}
      </div>
      {plans.map((plan) => (
        <div key={plan.id} className="card">
          <div className="card-header">
            <h3>{translateContent(plan.title, language)}</h3>
            <span className={`plan-status status-${plan.status}`}>{tr({ '进行中': 'Active', '已完成': 'Completed', '已暂停': 'Paused' }[plan.status] || plan.status, plan.status)}</span>
          </div>
          <p className="muted">{tr(`${plan.frequency_per_week} sessions/week · about ${plan.duration_minutes} min/session`, `每周 ${plan.frequency_per_week} 次 · 每次约 ${plan.duration_minutes} 分钟`)}</p>
          <div className="exercise-today-grid">
            {plan.exercises.map((ex) => {
              const done = todayDones.has(ex.id);
              return (
                <div key={ex.id} className={`today-card ${done ? 'done' : ''}`}>
                  <div className="today-name">{translateContent(ex.name, language)}</div>
                  <div className="muted small">{tr(`${ex.sets} sets × ${ex.reps} reps · ${ex.duration_min} min`, `${ex.sets}组 × ${ex.reps}次 · ${ex.duration_min}分钟`)}</div>
                  <div className="muted small">{translateContent(ex.description, language)}</div>
                  {done ? (
                    <span className="today-done">✅ {tr('Completed today', '今日已完成')}</span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => logToday(plan, ex)}>
                      {tr('Mark complete', '记录今天完成')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {plan.notes && <p className="dim small">⚠ {translateContent(plan.notes, language)}</p>}
        </div>
      ))}
    </div>
  );
}
