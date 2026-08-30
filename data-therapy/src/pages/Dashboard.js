import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPatients, getOverview, getTrends, getInsights } from '../api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from 'recharts';
import { useAuth, useLanguage } from '../context';
import { translateContent, translateServerText } from '../translations';

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// 每个指标标注其临床评估量表（整数量表：NRS/测角器/MMT/Berg/6MWT/Barthel）
const getDashMetrics = (tr) => [
  { key: 'composite_score', label: tr('Composite Recovery Index (0-100)', '综合恢复指数 (0-100)'), scale: tr('Average of 7 metrics normalized to their scale ranges', '7 项指标按量表范围归一化取平均') },
  { key: 'pain_score', label: tr('Pain (NRS 0-10, integer)', '疼痛 (NRS 0-10 整数)'), scale: tr('Numeric Rating Scale (NRS)', 'NRS 数字评分法') },
  { key: 'range_of_motion', label: tr('Range of Motion (°)', '关节活动度 (°)'), scale: tr('Goniometer reading', '测角器读数') },
  { key: 'muscle_strength', label: tr('Muscle Strength (MMT 0-5)', '肌力 (MMT 0-5)'), scale: tr('Manual Muscle Testing (MMT)', 'MMT 徒手肌力分级') },
  { key: 'balance_score', label: tr('Balance (Berg 0-56)', '平衡能力 (Berg 0-56)'), scale: tr('Berg Balance Scale', 'Berg 平衡量表') },
  { key: 'walking_distance', label: tr('Walking Distance (6MWT, m)', '步行距离 (6MWT, m)'), scale: tr('6-Minute Walk Test', '6 分钟步行试验') },
  { key: 'adl_score', label: tr('Daily Living (Barthel 0-100)', '日常生活 (Barthel 0-100)'), scale: tr('Barthel Index', 'Barthel 巴氏指数') },
  { key: 'training_completion', label: tr('Training Completion (%)', '训练完成率 (%)'), scale: tr('Calculated from weekly check-ins', '当周打卡自动计算') },
];

const DASH_METRIC_COLOR = {
  composite_score: '#16a085', pain_score: '#e74c3c',
  range_of_motion: '#2e8b57', muscle_strength: '#8e44ad',
  balance_score: '#2980b9', walking_distance: '#e67e22',
  adl_score: '#1abc9c', training_completion: '#3498db',
};

function PatientTrendChart({ patient }) {
  const { tr, language } = useLanguage();
  const dashMetrics = getDashMetrics(tr);
  const patientName = translateContent(patient.name, language);
  const [trends, setTrends] = useState(null);
  const [insights, setInsights] = useState(null);
  const [metric, setMetric] = useState('composite_score');

  useEffect(() => {
    getTrends(patient.id).then((r) => setTrends(r.data));
    getInsights(patient.id).then((r) => setInsights(r.data));
  }, [patient.id]);

  const seriesData = (trends?.metrics || {})[metric] || [];
  const chart = seriesData.map((p) => ({
    date: p.date.slice(5),
    [patientName]: p.value,
  }));

  const metricColor = DASH_METRIC_COLOR[metric] || '#2e8b57';
  const metricDomain = {
    composite_score: [0, 100], pain_score: [0, 10],
    range_of_motion: [0, 180], muscle_strength: [0, 5],
    balance_score: [0, 56], walking_distance: [0, 1000],
    adl_score: [0, 100], training_completion: [0, 100],
  }[metric] || [0, 100];
  const scaleNote = (dashMetrics.find((m) => m.key === metric) || {}).scale || '';

  return (
    <div className="card patient-card">
      <div className="card-header">
        <div>
          <div className="patient-name-row">
            <h3>{patientName}</h3>
            <span className={`stage-chip stage-${patient.treatment_stage}`}>
              {tr({ '早期': 'Early', '初期': 'Initial', '恢复期': 'Recovery', '中期': 'Middle', '后期': 'Late' }[patient.treatment_stage] || patient.treatment_stage, patient.treatment_stage)}
            </span>
            {insights?.risk_flag && (
              <span className="risk-chip">⚠ {tr('Progress risk', '进展风险')}</span>
            )}
          </div>
          <p className="patient-diagnosis">{translateContent(patient.diagnosis, language)}</p>
        </div>
        <div className="card-actions">
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {dashMetrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <Link to={`/patients/${patient.id}`} className="btn btn-primary btn-sm">
            {tr('View details', '查看详情')}
          </Link>
        </div>
      </div>
      {chart.length > 1 ? (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={metricDomain} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={patientName}
              stroke={metricColor}
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="muted">{tr('Not enough assessment data.', '暂无足够的评估数据')}</p>
      )}
      <p className="muted-small">{tr('Assessment scale:', '评估量表：')} {scaleNote}</p>
      {insights?.messages?.length > 0 && (
        <div className={`insight-box ${insights.risk_flag ? 'warn' : 'info'}`}>
          {translateServerText(insights.messages[0], language)}
        </div>
      )}
    </div>
  );
}

/* ---------------- patient home: chart of their own metrics ---------------- */
function PatientHome() {
  const { tr } = useLanguage();
  const [trends, setTrends] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    listPatients().then((r) => {
      if (r.data.length === 0) return;
      const p = r.data[0];
      setMe(p);
      getTrends(p.id).then((t) => setTrends(t.data));
    });
  }, []);

  if (!me) return <div className="card"><p className="muted">{tr('No patient record found.', '暂无患者档案')}</p></div>;

  const series = trends?.metrics || {};
  const hasData = Object.keys(series).some((k) => series[k]?.length > 1);
  if (!hasData) return <div className="card"><p className="muted">{tr('No assessment data yet.', '暂无评估数据')}</p></div>;

  // completion chart
  const completion = (series.training_completion || []).map((p) => ({
    date: p.date.slice(5),
    completion: p.value,
  }));
  // composite recovery index (normalized average of all metrics)
  const composite = (series.composite_score || []).map((p) => ({
    date: p.date.slice(5),
    composite: p.value,
  }));

  return (
    <div className="grid-2">
      <div className="card">
        <h3>{tr('Training Completion Trend', '训练完成率趋势')} <span className="muted-small">{tr('(calculated from check-ins)', '（由打卡自动计算）')}</span></h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={completion}>
            <defs>
              <linearGradient id="gCompletion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3498db" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3498db" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Area type="monotone" dataKey="completion" name={tr('Training Completion %', '训练完成率 %')} stroke="#3498db" fill="url(#gCompletion)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3>{tr('Composite Recovery Index Trend', '综合恢复指数趋势')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={composite}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="composite" name={tr('Composite Recovery Index', '综合恢复指数')} stroke="#16a085" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p className="muted-small">
          {tr('Composite Recovery Index (0-100) is the average of all recorded metrics normalized to their clinical scale ranges. Pain is reverse-scored; missing metrics are excluded.', '综合恢复指数（0-100）= 各已记录指标按临床量表范围归一化后的平均：疼痛（反向：(10−实际)/10）与 ROM(0-180°)、MMT 肌力(0-5)、Berg 平衡(0-56)、6MWT 步行(0-1000m)、Barthel(0-100)、完成率(0-100) 分别按 (实际值−下限)/(上限−下限) 归一，缺失指标不计入，最后取平均 ×100。')}
        </p>
      </div>
    </div>
  );
}

/* ---------- main dashboard ---------- */
export default function Dashboard() {
  const { user } = useAuth();
  const { tr, language } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [overview, setOverview] = useState(null);
  const [riskPatients, setRiskPatients] = useState([]);

  useEffect(() => {
    listPatients().then((r) => setPatients(r.data));
    if (user.role !== 'patient') {
      getOverview().then((r) => setOverview(r.data)).catch(() => {});
    }
    listPatients().then(async (r) => {
      const withRisk = [];
      for (const p of r.data.slice(0, 8)) {
        try {
          const ins = (await getInsights(p.id)).data;
          if (ins.risk_flag) withRisk.push({ ...p, insight: ins.messages[0] });
        } catch {}
      }
      setRiskPatients(withRisk);
    });
  }, [user.role]);

  if (user.role === 'patient') return <PatientHome />;

  return (
    <div className="dashboard">
      <div className="page-head">
        <h2>{user.role === 'admin' ? tr('System Overview', '系统概览') : tr('Patient Progress Overview', '患者进展概览')}</h2>
      </div>

      <div className="stat-grid">
        <StatCard label={tr('Total Patients', '患者总数')} value={overview?.total_patients ?? patients.length} icon="🧑" />
        <StatCard label={tr('Assessments', '评估记录')} value={overview?.total_assessments ?? '-'} icon="📋" />
        <StatCard label={tr('Rehabilitation Plans', '康复计划')} value={overview?.total_plans ?? '-'} icon="📝" />
        <StatCard label={tr('Average Completion', '平均训练完成率')} value={overview?.avg_completion ? `${overview.avg_completion}%` : '-'} icon="✅" />
        <StatCard label={tr('At-risk Patients', '风险患者')} value={overview?.risk_patients ?? '-'} icon="⚠️" />
      </div>

      {riskPatients.length > 0 && (
        <div className="alert alert-warning">
          <strong>⚠ {tr('Progress risk alert:', '进展风险提醒：')}</strong>
          {riskPatients.map((p) => (
            <span key={p.id}>
              <Link to={`/patients/${p.id}`}>{translateContent(p.name, language)}</Link> · {translateServerText(p.insight, language)}{'  '}
            </span>
          ))}
        </div>
      )}

      <div className="section-title">{tr('Patient Rehabilitation Trends', '患者康复趋势')}</div>
      <div className="grid-1">
        {patients.map((p) => (
          <PatientTrendChart key={p.id} patient={p} />
        ))}
      </div>
    </div>
  );
}
