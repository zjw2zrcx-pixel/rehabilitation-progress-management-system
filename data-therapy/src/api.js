import axios from 'axios';
import { translateServerText } from './translations';

// 同源模式：默认请求 /api/...（由 dev-server proxy / frp / Nginx 转发到后端）
// 如需直连其他地址，构建时设置 REACT_APP_API_BASE=https://host:port
const API_BASE = process.env.REACT_APP_API_BASE || '';

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

const errMsg = (e) => {
  const detail = e.response && e.response.data && e.response.data.detail;
  const fallback = localStorage.getItem('language') === 'zh'
    ? '请求失败，请稍后重试'
    : 'Request failed. Please try again.';
  return translateServerText(typeof detail === 'string' ? detail : fallback, localStorage.getItem('language') || 'en');
};

export { api, API_BASE, errMsg };

/* ---------- auth ---------- */
export const login = (username, password) =>
  api.post('/auth/login', new URLSearchParams({ username, password }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

export const registerUser = (payload) => api.post('/auth/register', payload);
export const fetchMe = () => api.get('/auth/me');

/* ---------- users (admin) ---------- */
export const listUsers = () => api.get('/users');
export const updateUser = (id, payload) => api.patch(`/users/${id}`, payload);
export const listTherapists = () => api.get('/users/therapists');

/* ---------- patients ---------- */
export const listPatients = () => api.get('/patients');
export const getPatient = (id) => api.get(`/patients/${id}`);
export const createPatient = (payload) => api.post('/patients', payload);
export const updatePatient = (id, payload) => api.patch(`/patients/${id}`, payload);
export const deletePatient = (id) => api.delete(`/patients/${id}`);

/* ---------- plans & exercises ---------- */
export const listPlans = (patientId) => api.get(`/plans/patient/${patientId}`);
export const createPlan = (payload) => api.post('/plans', payload);
export const updatePlan = (id, payload) => api.patch(`/plans/${id}`, payload);
export const deletePlan = (id) => api.delete(`/plans/${id}`);
export const addExercise = (planId, payload) =>
  api.post(`/plans/${planId}/exercises`, payload);
export const deleteExercise = (id) => api.delete(`/plans/exercises/${id}`);

/* ---------- assessments ---------- */
export const listAssessments = (patientId) =>
  api.get(`/assessments/patient/${patientId}`);
export const getTrends = (patientId) =>
  api.get(`/assessments/patient/${patientId}/trends`);
export const getInsights = (patientId) =>
  api.get(`/assessments/patient/${patientId}/insights`);
export const createAssessment = (payload) => api.post('/assessments', payload);
export const deleteAssessment = (id) => api.delete(`/assessments/${id}`);

/* ---------- training logs ---------- */
export const listLogs = (patientId) => api.get(`/training-logs/patient/${patientId}`);
export const createLog = (payload) => api.post('/training-logs', payload);
export const deleteLog = (id) => api.delete(`/training-logs/${id}`);

/* ---------- predictions ---------- */
export const runPrediction = (patientId, weeks = 4) =>
  api.post(`/predictions/patient/${patientId}?weeks_ahead=${weeks}`);
export const listPredictions = (patientId) =>
  api.get(`/predictions/patient/${patientId}`);

/* ---------- stats & export ---------- */
export const getOverview = () => api.get('/stats/overview');
export const exportAssessmentsCsv = (patientId) =>
  api.get(`/export/patient/${patientId}/assessments`, { responseType: 'blob' });
export const exportTrainingCsv = (patientId) =>
  api.get(`/export/patient/${patientId}/training`, { responseType: 'blob' });

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
