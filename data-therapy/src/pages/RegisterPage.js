import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, errMsg } from '../api';
import { useLanguage } from '../context';
import LanguageToggle from '../components/LanguageToggle';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'patient',
    email: '',
  });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const navigate = useNavigate();
  const { tr } = useLanguage();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    if (form.password.length < 6) {
      setError(tr('Password must be at least 6 characters.', '密码至少 6 位'));
      return;
    }
    try {
      await registerUser({
        username: form.username.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: form.role,
        email: form.email.trim() || undefined,
      });
      setOk(tr('Registration successful. Please sign in.', '注册成功，请登录'));
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div className="auth-page">
      <LanguageToggle floating />
      <div className="auth-card">
        <div className="auth-logo">🩺</div>
        <h1 className="auth-title">{tr('Create account', '注册账号')}</h1>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>{tr('Username', '用户名')}</label>
            <input value={form.username} onChange={set('username')} placeholder={tr('At least 3 characters', '至少 3 个字符')} />
          </div>
          <div className="form-group">
            <label>{tr('Password', '密码')}</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder={tr('At least 6 characters', '至少 6 位')} />
          </div>
          <div className="form-group">
            <label>{tr('Full name', '姓名')}</label>
            <input value={form.full_name} onChange={set('full_name')} placeholder={tr('Your full name', '真实姓名')} />
          </div>
          <div className="form-group">
            <label>{tr('Role', '角色')}</label>
            <select value={form.role} onChange={set('role')}>
              <option value="patient">{tr('Patient', '患者')}</option>
              <option value="therapist">{tr('Therapist', '治疗师')}</option>
              <option value="admin">{tr('Admin', '管理员')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{tr('Email (optional)', '邮箱（可选）')}</label>
            <input value={form.email} onChange={set('email')} placeholder="you@example.com" />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {ok && <div className="alert alert-success">{ok}</div>}
          <button className="btn btn-primary btn-block">{tr('Create account', '注 册')}</button>
        </form>
        <p className="auth-footer">
          {tr('Already have an account?', '已有账号？')} <Link to="/login">{tr('Sign in', '去登录')}</Link>
        </p>
      </div>
    </div>
  );
}
