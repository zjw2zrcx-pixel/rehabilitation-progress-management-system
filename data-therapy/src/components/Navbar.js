import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useLanguage } from '../context';
import LanguageToggle from './LanguageToggle';
import { translateContent } from '../translations';

const ROLE_CSS = {
  admin: 'badge-admin',
  therapist: 'badge-therapist',
  patient: 'badge-patient',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { tr, language } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [];
  if (user?.role === 'admin') {
    navItems.push(['/dashboard', tr('Overview', '概览')], ['/patients', tr('Patients', '患者管理')], ['/users', tr('Users', '用户管理')]);
  } else if (user?.role === 'therapist') {
    navItems.push(['/dashboard', tr('Overview', '概览')], ['/patients', tr('My Patients', '我的患者')]);
  } else {
    navItems.push(['/dashboard', tr('My Progress', '我的进度')], ['/my-progress', tr('Training Log', '训练记录')]);
  }

  const roleLabel = {
    admin: tr('Admin', '管理员'),
    therapist: tr('Therapist', '治疗师'),
    patient: tr('Patient', '患者'),
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="brand">
          <span className="brand-icon">🏥</span>
          <span>{tr('Rehabilitation Progress', '康复进展管理系统')}</span>
        </Link>
        <div className="nav-links">
          {navItems.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {label}
            </NavLink>
          ))}
        </div>
        <div className="nav-user">
          <span className={`badge ${ROLE_CSS[user?.role] || ''}`}>
            {roleLabel[user?.role]}
          </span>
          <span className="nav-name">{translateContent(user?.full_name || user?.username, language)}</span>
          <LanguageToggle />
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            {tr('Log out', '退出')}
          </button>
        </div>
      </div>
    </nav>
  );
}
