import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listPatients, createPatient, errMsg } from '../api';
import { useAuth, useLanguage } from '../context';
import { translateContent } from '../translations';

const EMPTY = {
  name: '', age: '', gender: 'male', diagnosis: '',
  long_term_goal: '', short_term_goal: '',
  initial_assessment: '', treatment_stage: '初期',
  admission_date: '',
};

export default function PatientList() {
  const { user } = useAuth();
  const { tr, language } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const canEdit = user.role !== 'patient';

  const load = () => {
    setLoading(true);
    listPatients()
      .then((r) => setPatients(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        admission_date: form.admission_date || null,
      };
      const { data } = await createPatient(payload);
      setShowForm(false);
      setForm(EMPTY);
      navigate(`/patients/${data.id}`);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>{user.role === 'admin' ? tr('Patient Records', '患者档案管理') : tr('My Patients', '我的患者')}</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? tr('Cancel', '取消') : tr('+ New Patient', '+ 新建患者档案')}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card">
          <h3>{tr('New Patient Record', '新建患者档案')}</h3>
          <form onSubmit={onSubmit} className="form-grid">
            <div className="form-group">
              <label>{tr('Name *', '姓名 *')}</label>
              <input value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label>{tr('Age *', '年龄 *')}</label>
              <input type="number" min={0} max={120} value={form.age} onChange={set('age')} required />
            </div>
            <div className="form-group">
              <label>{tr('Gender', '性别')}</label>
              <select value={form.gender} onChange={set('gender')}>
                <option value="male">{tr('Male', '男')}</option>
                <option value="female">{tr('Female', '女')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{tr('Diagnosis *', '诊断类型 *')}</label>
              <input value={form.diagnosis} onChange={set('diagnosis')} placeholder={tr('e.g. knee osteoarthritis (post-TKA)', '如：膝骨性关节炎（TKA 术后）')} required />
            </div>
            <div className="form-group">
              <label>{tr('Treatment stage', '治疗阶段')}</label>
              <select value={form.treatment_stage} onChange={set('treatment_stage')}>
                <option value="早期">{tr('Early', '早期')}</option><option value="恢复期">{tr('Recovery', '恢复期')}</option><option value="中期">{tr('Middle', '中期')}</option><option value="后期">{tr('Late', '后期')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{tr('Admission date', '入院日期')}</label>
              <input type="date" value={form.admission_date} onChange={set('admission_date')} />
            </div>
            <div className="form-group span-2">
              <label>{tr('Long-term functional goal', '长期康复目标（功能性）')}</label>
              <textarea value={form.long_term_goal} onChange={set('long_term_goal')} rows={2} placeholder={tr('e.g. climb stairs and walk 1 km independently within 3 months', '如：术后3个月能独立上下楼、步行1公里，无痛完成日常家务')} />
            </div>
            <div className="form-group span-2">
              <label>{tr('Short-term functional goal', '短期康复目标（功能性）')}</label>
              <textarea value={form.short_term_goal} onChange={set('short_term_goal')} rows={2} placeholder={tr('e.g. pain-free sit-to-stand and walk 200 m within 2 weeks', '如：2周内无痛完成床边坐站转移，室内步行200米')} />
            </div>
            <div className="form-group span-2">
              <label>{tr('Initial assessment', '初始评估结果')}</label>
              <textarea value={form.initial_assessment} onChange={set('initial_assessment')} rows={2} placeholder={tr('e.g. pain 7/10, flexion 68°', '如：疼痛 7/10，屈曲 68°')} />
            </div>
            <div className="span-2">
              <button className="btn btn-primary">{tr('Create patient', '创建患者')}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="muted">{tr('Loading...', '加载中…')}</p>
      ) : patients.length === 0 ? (
        <div className="card"><p className="muted">{tr('No patients found.', '暂无患者')}</p></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>{tr('Name', '姓名')}</th><th>{tr('Age', '年龄')}</th><th>{tr('Gender', '性别')}</th>
                <th>{tr('Diagnosis', '诊断')}</th><th>{tr('Stage', '阶段')}</th><th>{tr('Therapist', '负责治疗师')}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <td>{p.id}</td>
                  <td><strong>{translateContent(p.name, language)}</strong></td>
                  <td>{p.age}</td>
                  <td>{p.gender === 'male' ? tr('Male', '男') : tr('Female', '女')}</td>
                  <td className="td-diagnosis">{translateContent(p.diagnosis, language)}</td>
                  <td><span className={`stage-chip stage-${p.treatment_stage}`}>{tr({ '早期': 'Early', '初期': 'Initial', '恢复期': 'Recovery', '中期': 'Middle', '后期': 'Late' }[p.treatment_stage] || p.treatment_stage, p.treatment_stage)}</span></td>
                  <td>{translateContent(p.therapist_name, language) || '-'}</td>
                  <td><Link to={`/patients/${p.id}`}>{tr('Details →', '详情 →')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
