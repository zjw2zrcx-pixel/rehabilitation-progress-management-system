import React, { useEffect, useState } from 'react';
import { listUsers, updateUser, errMsg } from '../api';
import { useLanguage } from '../context';
import { translateContent } from '../translations';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const { tr, language } = useLanguage();
  const roleLabel = { admin: tr('Admin', '管理员'), therapist: tr('Therapist', '治疗师'), patient: tr('Patient', '患者') };

  const load = () => listUsers().then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const toggle = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (e) { setMsg({ type: 'error', text: errMsg(e) }); }
  };

  const resetPwd = async (u) => {
    const displayName = translateContent(u.full_name || u.username, language);
    const pwd = window.prompt(tr(`Set a new password for ${displayName} (at least 6 characters)`, `为 ${displayName} 设置新密码（至少6位）`));
    if (!pwd) return;
    try {
      await updateUser(u.id, { password: pwd });
      setMsg({ type: 'ok', text: tr(`Password reset for ${u.username}.`, `已重置 ${u.username} 的密码`) });
    } catch (e) { setMsg({ type: 'error', text: errMsg(e) }); }
  };

  return (
    <div>
      <div className="page-head"><h2>{tr('User Management', '用户管理')}</h2></div>
      {msg.text && <div className={`alert ${msg.type === 'ok' ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>{tr('Username', '用户名')}</th><th>{tr('Name', '姓名')}</th><th>{tr('Role', '角色')}</th><th>{tr('Email', '邮箱')}</th><th>{tr('Status', '状态')}</th><th>{tr('Registered', '注册时间')}</th><th>{tr('Actions', '操作')}</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{translateContent(u.full_name, language)}</td>
                  <td><span className={`badge badge-user badge-${u.role}`}>{roleLabel[u.role]}</span></td>
                  <td>{u.email || '-'}</td>
                  <td>
                    <span className={`plan-status ${u.is_active ? 'status-进行中' : 'status-已暂停'}`}>
                      {u.is_active ? tr('Active', '正常') : tr('Disabled', '已禁用')}
                    </span>
                  </td>
                  <td>{u.created_at?.slice(0, 10)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(u)}>
                      {u.is_active ? tr('Disable', '禁用') : tr('Enable', '启用')}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => resetPwd(u)}>{tr('Reset password', '重置密码')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
