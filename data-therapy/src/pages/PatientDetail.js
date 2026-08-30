import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getPatient, updatePatient, getTrends, getInsights, listAssessments,
  createAssessment, deleteAssessment, listPlans, createPlan, updatePlan,
  deletePlan, addExercise, deleteExercise, runPrediction, listPredictions,
  listLogs, exportAssessmentsCsv, exportTrainingCsv,
  downloadBlob, errMsg,
} from '../api';
import { useAuth, useLanguage } from '../context';
import TrendChart from '../components/TrendChart';
import { translateContent, translateServerText } from '../translations';

// 每个指标标注所采用的临床评估量表；integer=true 表示整数量表（预测/展示均不出现小数）
const METRIC_META = {
  composite_score: { label: '综合恢复指数 (0-100)', labelEn: 'Composite Recovery Index (0-100)', scale: '7 项指标按量表范围归一化取平均', scaleEn: 'Average of 7 metrics normalized to their scale ranges', color: '#16a085', min: 0, max: 100, integer: false },
  pain_score: { label: '疼痛 (NRS 0-10 整数)', labelEn: 'Pain (NRS 0-10, integer)', scale: 'NRS 数字评分法', scaleEn: 'Numeric Rating Scale (NRS)', color: '#e74c3c', min: 0, max: 10, integer: true },
  range_of_motion: { label: '关节活动度 (°)', labelEn: 'Range of Motion (°)', scale: '测角器读数', scaleEn: 'Goniometer reading', color: '#2e8b57', min: 0, max: 180, integer: true },
  muscle_strength: { label: '肌力 (MMT 0-5)', labelEn: 'Muscle Strength (MMT 0-5)', scale: 'MMT 徒手肌力分级', scaleEn: 'Manual Muscle Testing (MMT)', color: '#8e44ad', min: 0, max: 5, integer: true },
  balance_score: { label: '平衡能力 (Berg 0-56)', labelEn: 'Balance (Berg 0-56)', scale: 'Berg 平衡量表', scaleEn: 'Berg Balance Scale', color: '#2980b9', min: 0, max: 56, integer: true },
  walking_distance: { label: '步行距离 (6MWT, m)', labelEn: 'Walking Distance (6MWT, m)', scale: '6 分钟步行试验', scaleEn: '6-Minute Walk Test', color: '#e67e22', min: 0, max: 1000, integer: true },
  adl_score: { label: '日常生活 (Barthel 0-100)', labelEn: 'Daily Living (Barthel 0-100)', scale: 'Barthel 巴氏指数', scaleEn: 'Barthel Index', color: '#1abc9c', min: 0, max: 100, integer: true },
  training_completion: { label: '训练完成率 (%)', labelEn: 'Training Completion (%)', scale: '当周打卡自动计算', scaleEn: 'Calculated from weekly check-ins', color: '#3498db', min: 0, max: 100, integer: false },
};

const getMetricMeta = (tr) => Object.fromEntries(
  Object.entries(METRIC_META).map(([key, value]) => [key, {
    ...value,
    label: tr(value.labelEn, value.label),
    scale: tr(value.scaleEn, value.scale),
  }])
);

// 整数指标的数值格式化（避免显示 4.0 / 82.5 等小数）
export const fmtMetricValue = (metric, v) => {
  if (v == null) return '-';
  const m = METRIC_META[metric];
  return m?.integer ? String(Math.round(v)) : Number(v).toFixed(1);
};

const ASSESS_FORM = {
  assessment_date: new Date().toISOString().slice(0, 10),
  phase: '',
  pain_score: '', range_of_motion: '', rom_joint: 'knee_flexion',
  muscle_strength: '', balance_score: '', walking_distance: '',
  adl_score: '', notes: '',
};

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- tab: 概览（档案信息） ---------------- */
function OverviewTab({ patient, canEdit, onSave }) {
  const { tr, language } = useLanguage();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ...patient });
  const [msg, setMsg] = useState('');

  const save = async () => {
    try {
      const { data } = await updatePatient(patient.id, {
        name: form.name, age: Number(form.age), gender: form.gender,
        diagnosis: form.diagnosis,
        long_term_goal: form.long_term_goal,
        short_term_goal: form.short_term_goal,
        initial_assessment: form.initial_assessment,
        treatment_stage: form.treatment_stage,
        admission_date: form.admission_date || null,
      });
      onSave(data);
      setEdit(false);
      setMsg(tr('Saved', '已保存'));
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg(errMsg(e));
    }
  };

  const F = ({ k, label, type = 'text' }) => (
    <div className="form-group">
      <label>{label}</label>
      {edit ? (
        type === 'textarea' ? (
          <textarea value={translateContent(form[k], language)} onChange={(e) => setForm({ ...form, [k]: e.target.value })} rows={2} />
        ) : k === 'gender' ? (
          <select value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
            <option value="male">{tr('Male', '男')}</option>
            <option value="female">{tr('Female', '女')}</option>
          </select>
        ) : k === 'treatment_stage' ? (
          <select value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
            <option value="早期">{tr('Early', '早期')}</option>
            <option value="初期">{tr('Initial', '初期')}</option>
            <option value="恢复期">{tr('Recovery', '恢复期')}</option>
            <option value="中期">{tr('Middle', '中期')}</option>
            <option value="后期">{tr('Late', '后期')}</option>
          </select>
        ) : (
          <input type={type} value={translateContent(form[k], language)} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        )
      ) : (
        <div className="field-value">{
          k === 'gender'
            ? tr(patient[k] === 'male' ? 'Male' : 'Female', patient[k] === 'male' ? '男' : '女')
            : k === 'treatment_stage'
              ? tr({ '早期': 'Early', '初期': 'Initial', '恢复期': 'Recovery', '中期': 'Middle', '后期': 'Late' }[patient[k]] || patient[k], patient[k])
              : translateContent(patient[k], language) || '-'
        }</div>
      )}
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <h3>{tr('Patient Record', '患者档案')}</h3>
        {canEdit && !edit && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>{tr('Edit', '编辑')}</button>}
        {canEdit && edit && (
          <div>
            <button className="btn btn-primary btn-sm" onClick={save}>{tr('Save', '保存')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>{tr('Cancel', '取消')}</button>
          </div>
        )}
      </div>
      {msg && <div className="alert alert-error">{msg}</div>}
      <div className="form-grid">
        <F k="name" label={tr('Name', '姓名')} />
        <F k="age" label={tr('Age', '年龄')} type="number" />
        <F k="gender" label={tr('Gender', '性别')} />
        <F k="treatment_stage" label={tr('Treatment stage', '治疗阶段')} />
        <F k="diagnosis" label={tr('Diagnosis', '诊断类型')} />
        <F k="admission_date" label={tr('Admission date', '入院日期')} type="date" />
        <F k="long_term_goal" label={tr('Long-term functional goal', '长期康复目标（功能性）')} type="textarea" />
        <F k="short_term_goal" label={tr('Short-term functional goal', '短期康复目标（功能性）')} type="textarea" />
        <F k="initial_assessment" label={tr('Initial assessment', '初始评估')} type="textarea" />
      </div>
      <p className="muted">{tr('Therapist:', '负责治疗师：')} {translateContent(patient.therapist_name, language) || '-'}</p>
    </div>
  );
}

/* ---------------- tab: 康复计划 ---------------- */
function PlansTab({ patientId, canEdit }) {
  const { tr, language } = useLanguage();
  const metricMeta = getMetricMeta(tr);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', start_date: new Date().toISOString().slice(0, 10),
    end_date: '', status: '进行中', frequency_per_week: 5, duration_minutes: 30, notes: '',
  });
  const [exForm, setExForm] = useState({ planId: null, name: '', sets: 3, reps: 10, duration_min: 10, target_metric: 'range_of_motion', progression: '', description: '' });

  const load = () => listPlans(patientId).then((r) => setPlans(r.data));
  useEffect(() => {
    listPlans(patientId).then((r) => setPlans(r.data));
  }, [patientId]);

  const setFormField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    try {
      await createPlan({ ...form, patient_id: patientId, frequency_per_week: Number(form.frequency_per_week), duration_minutes: Number(form.duration_minutes) });
      setShowForm(false);
      setMsg('');
      load();
    } catch (err) { setMsg(errMsg(err)); }
  };

  const toggleStatus = async (plan) => {
    try {
      await updatePlan(plan.id, { status: plan.status === '已暂停' ? '进行中' : '已暂停' });
      load();
    } catch { }
  };

  const delPlan = async (planId) => {
    if (!window.confirm(tr('Delete this plan and all of its exercises?', '确认删除该计划及其全部训练动作？'))) return;
    try { await deletePlan(planId); load(); } catch (e) { setMsg(errMsg(e)); }
  };

  const addEx = async (e) => {
    e.preventDefault();
    try {
      await addExercise(exForm.planId, {
        name: exForm.name, sets: Number(exForm.sets), reps: Number(exForm.reps),
        duration_min: Number(exForm.duration_min), target_metric: exForm.target_metric,
        progression: exForm.progression, description: exForm.description,
      });
      setExForm({ ...exForm, name: '' });
      load();
    } catch (err) { setMsg(errMsg(err)); }
  };

  const delEx = async (exId) => {
    try { await deleteExercise(exId); load(); } catch (e) { setMsg(errMsg(e)); }
  };

  return (
    <div className="stack">
      {msg && <div className="alert alert-error">{msg}</div>}
      {canEdit && (
        <div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? tr('Cancel', '取消') : tr('+ New Rehabilitation Plan', '+ 新建康复计划')}
          </button>
          {showForm && (
            <div className="card inner">
              <h4>{tr('New Rehabilitation Plan', '新建康复计划')}</h4>
              <form onSubmit={create} className="form-grid">
                <div className="form-group">
                  <label>{tr('Plan name *', '计划名称 *')}</label>
                  <input value={form.title} onChange={setFormField('title')} required />
                </div>
                <div className="form-group">
                  <label>{tr('Description', '描述')}</label>
                  <input value={form.description} onChange={setFormField('description')} />
                </div>
                <div className="form-group">
                  <label>{tr('Start date', '开始日期')}</label>
                  <input type="date" value={form.start_date} onChange={setFormField('start_date')} />
                </div>
                <div className="form-group">
                  <label>{tr('End date', '结束日期')}</label>
                  <input type="date" value={form.end_date} onChange={setFormField('end_date')} />
                </div>
                <div className="form-group">
                  <label>{tr('Sessions per week', '每周频率')}</label>
                  <input type="number" min={1} max={7} value={form.frequency_per_week} onChange={setFormField('frequency_per_week')} />
                </div>
                <div className="form-group">
                  <label>{tr('Session duration (min)', '每次时长（分钟）')}</label>
                  <input type="number" min={5} value={form.duration_minutes} onChange={setFormField('duration_minutes')} />
                </div>
                <div className="form-group span-2">
                  <label>{tr('Precautions', '注意事项')}</label>
                  <input value={form.notes} onChange={setFormField('notes')} placeholder={tr('e.g. pause training if pain is above 4/10', '如：疼痛>4/10 暂停训练')} />
                </div>
                <div className="span-2"><button className="btn btn-primary">{tr('Create plan', '创建计划')}</button></div>
              </form>
            </div>
          )}
        </div>
      )}

      {plans.length === 0 ? (
        <p className="muted">{tr('No rehabilitation plans yet.', '暂无康复计划')}</p>
      ) : (
        plans.map((plan) => (
          <div key={plan.id} className="plan-block">
            <div className="plan-head">
              <div>
                <h4>{translateContent(plan.title, language)}</h4>
                <span className={`plan-status status-${plan.status}`}>{tr({ '进行中': 'Active', '已完成': 'Completed', '已暂停': 'Paused' }[plan.status] || plan.status, plan.status)}</span>
                <span className="muted">
                  {tr(`${plan.start_date} to ${plan.end_date || 'long term'} · ${plan.frequency_per_week} sessions/week · ${plan.duration_minutes} min/session`, `${plan.start_date} ~ ${plan.end_date || '长期'} · 每周 ${plan.frequency_per_week} 次 · 每次 ${plan.duration_minutes} 分钟`)}
                </span>
              </div>
              {canEdit && (
                <div className="plan-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(plan)}>
                    {plan.status === '已暂停' ? tr('Resume', '恢复') : tr('Pause', '暂停')}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => delPlan(plan.id)}>{tr('Delete', '删除')}</button>
                </div>
              )}
            </div>
            {plan.description && <p className="muted">{translateContent(plan.description, language)}</p>}
            <ul className="exercise-list">
              {plan.exercises.map((ex) => (
                <li key={ex.id}>
                  <div>
                    <strong>{translateContent(ex.name, language)}</strong>
                    <span className="muted">
                      {' '}{tr(`· ${ex.sets} sets × ${ex.reps} reps · ${ex.duration_min} min`, `· ${ex.sets}组×${ex.reps}次 · ${ex.duration_min}分钟`)}
                      {ex.target_metric && tr(` · Target: ${metricMeta[ex.target_metric]?.label || ex.target_metric}`, ` · 目标:${metricMeta[ex.target_metric]?.label || ex.target_metric}`)}
                    </span>
                    <div className="muted small">{translateContent(ex.description, language)}</div>
                  </div>
                  {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => delEx(ex.id)}>{tr('Delete', '删除')}</button>}
                </li>
              ))}
            </ul>
            {canEdit && (
              <form className="exercise-add" onSubmit={addEx}>
                <input placeholder={tr('Exercise name', '动作名称')} value={exForm.name} onChange={(e) => setExForm({ ...exForm, planId: plan.id, name: e.target.value })} required />
                <input type="number" placeholder={tr('Sets', '组数')} style={{ width: 70 }} value={exForm.sets} onChange={(e) => setExForm({ ...exForm, sets: e.target.value })} />
                <input type="number" placeholder={tr('Reps', '次数')} style={{ width: 70 }} value={exForm.reps} onChange={(e) => setExForm({ ...exForm, reps: e.target.value })} />
                <select value={exForm.target_metric} onChange={(e) => setExForm({ ...exForm, target_metric: e.target.value })}>
                  {Object.entries(metricMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button className="btn btn-primary btn-sm">{tr('+ Add exercise', '+ 添加动作')}</button>
              </form>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ---------------- tab: 评估记录 ---------------- */
function AssessmentsTab({ patientId, canEdit }) {
  const { tr, language } = useLanguage();
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => ({
    ...ASSESS_FORM,
    phase: language === 'zh' ? '恢复期' : 'Recovery',
  }));
  const [msg, setMsg] = useState('');

  const load = () => listAssessments(patientId).then((r) => setRecords(r.data));
  useEffect(() => {
    listAssessments(patientId).then((r) => setRecords(r.data));
  }, [patientId]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, patient_id: patientId };
      // 训练完成率由后端按打卡自动计算，不随本表单提交
      for (const k of ['pain_score', 'range_of_motion', 'muscle_strength', 'balance_score', 'walking_distance', 'adl_score']) {
        payload[k] = payload[k] === '' ? null : Number(payload[k]);
      }
      await createAssessment(payload);
      setForm({ ...ASSESS_FORM, phase: language === 'zh' ? '恢复期' : 'Recovery' });
      setShowForm(false);
      load();
    } catch (err) { setMsg(errMsg(err)); }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>{tr('Rehabilitation Assessments', '康复评估记录')}</h3>
        {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? tr('Cancel', '取消') : tr('+ New Assessment', '+ 录入评估')}</button>}
      </div>
      {msg && <div className="alert alert-error">{msg}</div>}

      {showForm && (
        <form onSubmit={submit} className="form-grid">
          <div className="form-group">
            <label>{tr('Assessment date', '评估日期')}</label>
            <input type="date" value={form.assessment_date} onChange={set('assessment_date')} required />
          </div>
          <div className="form-group">
            <label>{tr('Phase', '阶段')}</label>
            <input value={form.phase} onChange={set('phase')} placeholder={tr('e.g. Week 5', '如：第5周')} />
          </div>
          <div className="form-group">
            <label>{tr('Pain score (NRS 0-10, integer)', '疼痛评分 (NRS 0-10 整数)')}</label>
            <input type="number" step="1" min={0} max={10} value={form.pain_score} onChange={set('pain_score')} placeholder={tr('Integer 0-10', '整数 0-10')} />
          </div>
          <div className="form-group">
            <label>{tr('Range of motion (goniometer, °)', '关节活动度 (测角器, °)')}</label>
            <input type="number" step="1" min={0} max={180} value={form.range_of_motion} onChange={set('range_of_motion')} />
          </div>
          <div className="form-group">
            <label>{tr('Muscle strength (MMT 0-5, integer)', '肌力 (MMT 0-5 整数)')}</label>
            <input type="number" step="1" min={0} max={5} value={form.muscle_strength} onChange={set('muscle_strength')} />
          </div>
          <div className="form-group">
            <label>{tr('Balance (Berg Balance Scale 0-56)', '平衡能力 (Berg 平衡量表 0-56)')}</label>
            <input type="number" step="1" min={0} max={56} value={form.balance_score} onChange={set('balance_score')} />
          </div>
          <div className="form-group">
            <label>{tr('Walking distance (6MWT, m)', '步行距离 (6MWT, 米)')}</label>
            <input type="number" step="1" min={0} max={1000} value={form.walking_distance} onChange={set('walking_distance')} />
          </div>
          <div className="form-group">
            <label>{tr('Daily living (Barthel Index 0-100)', '日常生活 (Barthel 巴氏指数 0-100)')}</label>
            <input type="number" step="1" min={0} max={100} value={form.adl_score} onChange={set('adl_score')} />
          </div>
          <div className="form-group span-2 muted-small">
            {tr('All metrics use integer scales (NRS / goniometer / MMT / Berg / 6MWT / Barthel); decimals will be rejected. The 6MWT is not recommended during the first four weeks after procedures such as TKA and may be left blank.', '各指标均为整数量表（NRS / 测角器 / MMT / Berg / 6MWT / Barthel），提交小数将返回 422。6 分钟步行试验为次极量运动测试：TKA 等术后早期（约前 4 周）不建议执行，可留空，改用 10 米步行或室内步行记录。')}
          </div>
          <div className="form-group span-2 muted-small">
            {tr('Training completion is calculated automatically from weekly check-ins and does not require manual entry.', '训练完成率由当周训练打卡自动计算（已完成打卡数 / 当周总打卡数），无需手工录入。')}
          </div>
          <div className="form-group span-2">
            <label>{tr('Notes', '备注')}</label>
            <input value={form.notes} onChange={set('notes')} placeholder={tr('Brief assessment notes', '本次评估简要说明')} />
          </div>
          <div className="span-2"><button className="btn btn-primary">{tr('Submit assessment', '提交评估')}</button></div>
        </form>
      )}

      {records.length === 0 ? (
        <p className="muted">{tr('No assessments yet.', '暂无评估记录')}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{tr('Date', '日期')}</th><th>{tr('Phase', '阶段')}</th><th>{tr('Pain', '疼痛')}</th><th>ROM</th><th>{tr('Strength', '肌力')}</th>
                <th>{tr('Balance', '平衡')}</th><th>6MWT</th><th>ADL</th><th>{tr('Completion', '完成率')}</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.assessment_date}</td>
                  <td>{translateContent(tr({ '早期': 'Early', '初期': 'Initial', '恢复期': 'Recovery', '中期': 'Middle', '后期': 'Late' }[r.phase] || r.phase, r.phase), language)}</td>
                  <td>{r.pain_score ?? '-'}</td>
                  <td>{r.range_of_motion ?? '-'}</td>
                  <td>{r.muscle_strength ?? '-'}</td>
                  <td>{r.balance_score ?? '-'}</td>
                  <td>{r.walking_distance ?? '-'}</td>
                  <td>{r.adl_score ?? '-'}</td>
                  <td>{r.training_completion != null ? `${r.training_completion}%` : '-'}</td>
                  {canEdit && (
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm(tr('Delete this assessment?', '删除该评估？'))) deleteAssessment(r.id).then(load); }}>{tr('Delete', '删除')}</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- tab: 趋势图表 ---------------- */
function TrendsTab({ patientId }) {
  const { tr, language } = useLanguage();
  const metricMeta = getMetricMeta(tr);
  const [trends, setTrends] = useState(null);
  const [insights, setInsights] = useState(null);
  const [metric, setMetric] = useState('composite_score');

  useEffect(() => {
    getTrends(patientId).then((r) => setTrends(r.data));
    getInsights(patientId).then((r) => setInsights(r.data));
  }, [patientId]);

  if (!trends) return <div className="card"><p className="muted">{tr('Loading...', '加载中…')}</p></div>;

  const series = trends.metrics;
  const hasData = Object.keys(series).some((k) => series[k] && series[k].length > 1);

  return (
    <div className="stack">
      {insights && (
        <div className={`alert ${insights.risk_flag ? 'alert-warning' : 'alert-info'}`}>
          <strong>{insights.risk_flag ? tr('⚠ Progress risk', '⚠ 进展风险') : tr('✅ Progress on track', '✅ 进展正常')}</strong>
          <ul>
            {insights.messages.map((m, i) => <li key={i}>{translateServerText(m, language)}</li>)}
          </ul>
        </div>
      )}
      {!hasData && <div className="card"><p className="muted">{tr('At least two assessments are required to plot trends.', '暂无足够的评估数据用于绘图（至少需要 2 条）')}</p></div>}
      <div className="alert alert-info small">
        <strong>{tr('Assessment scales: ', '评估量表口径：')}</strong>
        {tr('NRS (pain 0-10) · goniometer (ROM °) · MMT (0-5) · Berg Balance Scale (0-56) · 6MWT (m) · Barthel Index (0-100). Values are integers. The Composite Recovery Index is the average of normalized recorded metrics, with pain reverse-scored.', 'NRS 数字评分法（疼痛 0-10）· 测角器（关节活动度 °）· MMT 徒手肌力（0-5）· Berg 平衡量表（0-56）· 6 分钟步行试验 6MWT（米）· Barthel 巴氏指数（0-100）。数据均为整数量表；6 分钟步行试验不宜在 TKA 等术后早期执行，对应期可留空。综合恢复指数 = 各已记录指标按量表范围归一化（疼痛反向）后取平均 ×100（0-100）。')}
      </div>
      <div className="card">
        <div className="card-header">
          <h3>{tr('Metric Trends', '指标变化趋势')}</h3>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {Object.entries(metricMeta).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <TrendChart
          data={(series[metric] || []).map((p) => ({ date: p.date.slice(5), value: p.value }))}
          color={metricMeta[metric].color}
          name={metricMeta[metric].label}
          domain={[metricMeta[metric].min, metricMeta[metric].max]}
        />
        <p className="muted-small">{tr('Assessment scale:', '评估量表：')} {metricMeta[metric].scale} ({metricMeta[metric].min}–{metricMeta[metric].max})</p>
      </div>
      <div className="grid-2">
        {['training_completion', 'walking_distance', 'balance_score', 'range_of_motion'].map((m) =>
          series[m] && series[m].length > 1 ? (
            <div className="card" key={m}>
              <h4>{metricMeta[m].label}</h4>
              <TrendChart
                series={series[m].map((p) => ({ date: p.date.slice(5), value: p.value }))}
                color={metricMeta[m].color}
                name={metricMeta[m].label}
                domain={[metricMeta[m].min, metricMeta[m].max]}
                height={160}
              />
              <p className="muted-small">{tr('Scale:', '量表：')} {metricMeta[m].scale}</p>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

/* ---------------- tab: 预测 ---------------- */
function PredictionTab({ patientId }) {
  const { tr, language } = useLanguage();
  const metricMeta = getMetricMeta(tr);
  const [weeks, setWeeks] = useState(4);
  const [preds, setPreds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async () => {
    setLoading(true);
    setMsg('');
    try {
      const { data } = await runPrediction(patientId, weeks);
      setPreds(data);
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { listPredictions(patientId).then((r) => setPreds(r.data)).catch(() => {}); }, [patientId]);

  return (
    <div className="card">
      <div className="card-header">
        <h3>{tr('Rehabilitation Outcome Prediction', '康复效果预测模型')}</h3>
        <div className="inline-form">
          <input type="number" min={1} max={12} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} style={{ width: 70 }} title={tr('Weeks ahead', '预测周数')} />
          <button className="btn btn-primary" onClick={run} disabled={loading}>
            {loading ? tr('Training...', '训练中…') : tr('Run prediction (sklearn)', '运行预测 (sklearn)')}
          </button>
        </div>
      </div>
      <p className="muted small">
        {tr(<>Uses <code>scikit-learn</code> linear regression to fit weekly change from historical assessments and predict each metric {weeks} weeks ahead. Recent changes are also evaluated for progress risk.</>, <>基于 <code>scikit-learn</code> 一元线性回归，利用历史评估序列拟合每周变化斜率，预测未来 {weeks} 周各指标水平；结合最近两次评估的变化方向给出 <em>progress risk</em> 提示。</>)}
      </p>
      {msg && <div className="alert alert-error">{msg}</div>}
      {preds.length === 0 ? (
        <p className="muted">{tr('Select “Run prediction” to generate results.', '点击"运行预测"生成结果')}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{tr('Metric', '指标')}</th><th>{tr('Current', '当前值')}</th><th>{tr(`Predicted (${weeks} weeks)`, `预测值（${weeks}周后）`)}</th>
                <th>R²</th><th>{tr('Weekly slope', '周斜率')}</th><th>{tr('Risk', '风险')}</th>
              </tr>
            </thead>
            <tbody>
              {preds.map((p) => (
                <tr key={p.id}>
                  <td>{metricMeta[p.metric]?.label || p.metric}</td>
                  <td>{fmtMetricValue(p.metric, p.current_value)}</td>
                  <td><strong>{fmtMetricValue(p.metric, p.predicted_value)}</strong></td>
                  <td>{p.r2_score != null ? p.r2_score.toFixed(3) : '-'}</td>
                  <td>{p.slope_per_week?.toFixed(2) ?? '-'}</td>
                  <td>
                    <span className={`risk-badge risk-${p.risk_level}`}>
                      {p.risk_flag ? tr({ high: 'High', medium: 'Medium', low: 'Low' }[p.risk_level] || p.risk_level, p.risk_level) : tr('Normal', '正常')}
                    </span>
                    <div className="muted small">{translateServerText(p.message, language)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- tab: 训练记录/导出 ---------------- */
function LogsTab({ patientId, canEdit }) {
  const { tr, language } = useLanguage();
  const [logs, setLogs] = useState([]);
  useEffect(() => { listLogs(patientId).then((r) => setLogs(r.data)); }, [patientId]);

  const exportA = async () => {
    const r = await exportAssessmentsCsv(patientId);
    downloadBlob(r.data, `patient_${patientId}_assessments.csv`);
  };
  const exportT = async () => {
    const r = await exportTrainingCsv(patientId);
    downloadBlob(r.data, `patient_${patientId}_training.csv`);
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <h3>{tr('Data Export', '数据导出')}</h3>
          <div>
            <button className="btn btn-primary" onClick={exportA}>{tr('Export Assessments CSV', '导出评估数据 CSV')}</button>
            <button className="btn btn-ghost" onClick={exportT}>{tr('Export Training CSV', '导出训练记录 CSV')}</button>
          </div>
        </div>
        <p className="muted small">{tr('CSV files can be opened in Excel or pandas for further analysis.', 'CSV 文件可直接用 Excel / pandas 打开，用于后续数据分析。')}</p>
      </div>
      <div className="card">
        <h3>{tr('Recent Training Logs', '近期训练记录')}</h3>
        {logs.length === 0 ? (
          <p className="muted">{tr('No training logs yet.', '暂无训练记录')}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{tr('Date', '日期')}</th><th>{tr('Exercise', '动作')}</th><th>{tr('Completed', '完成')}</th><th>{tr('Sets', '组数')}</th><th>{tr('Reps', '次数')}</th><th>{tr('Duration', '时长')}</th><th>{tr('Notes', '备注')}</th></tr>
              </thead>
              <tbody>
                {logs.slice(0, 30).map((l) => (
                  <tr key={l.id}>
                    <td>{l.log_date}</td>
                    <td>{l.exercise_id ? tr(`Exercise #${l.exercise_id}`, `动作#${l.exercise_id}`) : '-'}</td>
                    <td>{l.completed ? '✅' : '❌'}</td>
                    <td>{l.sets_done ?? '-'}</td>
                    <td>{l.reps_done ?? '-'}</td>
                    <td>{l.duration_min ?? '-'}</td>
                    <td>{l.note ? translateContent(translateServerText(l.note, language), language) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tr, language } = useLanguage();
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState('overview');
  const [err, setErr] = useState('');

  useEffect(() => {
    getPatient(id).then((r) => setPatient(r.data)).catch((e) => setErr(errMsg(e)));
  }, [id]);

  if (err) return <div className="card"><div className="alert alert-error">{err}</div><button className="btn btn-ghost" onClick={() => navigate(-1)}>{tr('Back', '返回')}</button></div>;
  if (!patient) return <p className="muted">{tr('Loading...', '加载中…')}</p>;

  const canEdit = user.role !== 'patient';

  const tabs = [
    { key: 'overview', label: tr('Record', '档案') },
    { key: 'plans', label: tr('Rehabilitation Plans', '康复计划') },
    { key: 'assessments', label: tr('Assessments', '评估记录') },
    { key: 'trends', label: tr('Trends', '趋势图表') },
    { key: 'predict', label: tr('Prediction', '预测分析') },
    { key: 'logs', label: tr('Data Export', '数据导出') },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patients')}>← {tr('Back to list', '返回列表')}</button>
          <h2>{translateContent(patient.name, language)}
            <span className={`stage-chip stage-${patient.treatment_stage}`}>{tr({ '早期': 'Early', '初期': 'Initial', '恢复期': 'Recovery', '中期': 'Middle', '后期': 'Late' }[patient.treatment_stage] || patient.treatment_stage, patient.treatment_stage)}</span>
          </h2>
          <p className="muted">{translateContent(patient.diagnosis, language)} · {tr('Therapist:', '负责治疗师：')} {translateContent(patient.therapist_name, language) || '-'}</p>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewTab patient={patient} canEdit={canEdit} onSave={setPatient} />}
      {tab === 'plans' && <PlansTab patientId={patient.id} canEdit={canEdit} />}
      {tab === 'assessments' && <AssessmentsTab patientId={patient.id} canEdit={canEdit} />}
      {tab === 'trends' && <TrendsTab patientId={patient.id} />}
      {tab === 'predict' && <PredictionTab patientId={patient.id} />}
      {tab === 'logs' && <LogsTab patientId={patient.id} canEdit={canEdit} />}
    </div>
  );
}
