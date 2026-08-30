import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, errMsg } from '../api';
import { useAuth, useLanguage } from '../context';
import LanguageToggle from '../components/LanguageToggle';

const DEMO_ACCOUNTS = [
  { role: 'admin', username: 'admin', password: 'admin123' },
  { role: 'therapist', username: 'wang.therapist', password: 'therapist123' },
  { role: 'patient', username: 'zhang.wei', password: 'patient123' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { tr } = useLanguage();
  const roleLabel = {
    admin: tr('Admin', '管理员'),
    therapist: tr('Therapist', '治疗师'),
    patient: tr('Patient', '患者'),
  };

  const doLogin = async (u = username, p = password) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await login(u, p);
      localStorage.setItem('token', data.access_token);
      setUser({ username: u, role: data.role, full_name: data.full_name });
      navigate('/dashboard');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    doLogin();
  };

  return (
    <div className="auth-page">
      <LanguageToggle floating />
      <div className="auth-card">
        <div className="auth-logo">🏥</div>
        <h1 className="auth-title">{tr('Rehabilitation Progress Management & Data Visualization System', '康复进展管理与数据可视化系统')}</h1>
        <p className="auth-sub">{tr('Secure clinical progress tracking', 'Rehabilitation Progress Management System')}</p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>{tr('Username', '用户名')}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={tr('Enter your username', '请输入用户名')}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{tr('Password', '密码')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tr('Enter your password', '请输入密码')}
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? tr('Signing in...', '登录中…') : tr('Sign in', '登 录')}
          </button>
        </form>

        <div className="auth-demo">
          <p className="auth-demo-title">{tr('Demo accounts (click to sign in)', '演示账号（点击一键填充）')}</p>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.username}
              className="demo-chip"
              onClick={() => doLogin(acc.username, acc.password)}
            >
              {roleLabel[acc.role]}
            </button>
          ))}
        </div>

        <p className="auth-footer">
          {tr('New here?', '还没有账号？')} <Link to="/register">{tr('Create a patient account', '注册患者账号')}</Link>
        </p>
      </div>
    </div>
  );
}
