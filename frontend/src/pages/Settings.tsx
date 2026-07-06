import React, { useState, useEffect } from 'react';
import { User, Bell, Database, Lock, CheckCircle, RefreshCw, Eye, EyeOff, Shield } from 'lucide-react';
import { api } from '../services/api';

const NAV_ITEMS = [
  { icon: <User size={14} />, label: 'Profile Settings', id: 'profile' },
  { icon: <Lock size={14} />, label: 'Security & Password', id: 'security' },
  { icon: <Database size={14} />, label: 'Connection Endpoints', id: 'database' },
  { icon: <Bell size={14} />, label: 'Notification Alerts', id: 'notifications' },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // DB (read-only display — env-configured)
  const [notifyOnRisk, setNotifyOnRisk] = useState(true);
  const [notifyOnGraph, setNotifyOnGraph] = useState(true);
  const [notifyOnLogin, setNotifyOnLogin] = useState(false);

  // Load user from localStorage token
  useEffect(() => {
    api.get('/auth/me').then(res => {
      setName(res.data.user?.name || '');
      setEmail(res.data.user?.email || '');
      setRole(res.data.user?.role || '');
    }).catch(() => {});
  }, []);

  const showSuccess = () => {
    setSaved(true); setError('');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name cannot be empty.');
    setSaving(true); setError('');
    try {
      const res = await api.put('/auth/profile', { name: name.trim() });
      if (res.data.token) {
        localStorage.setItem('brgi_token', res.data.token);
      }
      showSuccess();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Profile update failed.');
    } finally { setSaving(false); }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return setError('All password fields are required.');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    setSaving(true); setError('');
    try {
      await api.put('/auth/profile', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showSuccess();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Password change failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl mx-auto">
      {/* Header */}
      <div className="section-header">
        <div>
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Preferences</p>
          <h1 className="text-3xl font-bold text-slate-900 font-display">Account Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your profile, security, and system notification preferences.</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold animate-fade-in">
            <CheckCircle size={14} /> Saved successfully
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Sidebar Nav */}
        <div className="card p-4 space-y-1 h-fit">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 mb-2">Settings</p>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 text-left ${
                activeSection === item.id ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
              }`}>
              <span className={activeSection === item.id ? 'text-indigo-500' : ''}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Account info card */}
          <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                {name.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 truncate">{name || 'Loading...'}</p>
                <p className="text-[10px] text-slate-400 truncate">{email}</p>
              </div>
            </div>
            <span className={`badge text-[9px] ${role === 'ADMIN' ? 'badge-red' : role === 'ANALYST' ? 'badge-blue' : 'badge-slate'}`}>{role}</span>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-5">
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium">{error}</p>
          )}

          {/* Profile */}
          {activeSection === 'profile' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-4 font-display flex items-center gap-2 mb-5">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><User size={14} /></div>
                Profile Information
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Email Address</label>
                    <input type="email" value={email} disabled className="input bg-slate-50 text-slate-400 cursor-not-allowed" />
                    <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Account Role</label>
                  <div className={`inline-flex items-center gap-1.5 badge text-xs px-3 py-1.5 ${role === 'ADMIN' ? 'bg-rose-50 text-rose-700' : role === 'ANALYST' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    <Shield size={12} />{role}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Role is managed by administrators</p>
                </div>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {saving ? 'Saving...' : 'Update Profile'}
                </button>
              </form>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-4 font-display flex items-center gap-2 mb-5">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600"><Lock size={14} /></div>
                Change Password
              </h3>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="relative">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Current Password</label>
                  <input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="input pr-10" placeholder="Your current password" />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-700 cursor-pointer">
                    {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="relative">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">New Password</label>
                  <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input pr-10" placeholder="Min 6 characters" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-700 cursor-pointer">
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input" placeholder="Repeat new password" />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">Passwords do not match</p>
                )}
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                  {saving ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {/* Database */}
          {activeSection === 'database' && (
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-4 font-display flex items-center gap-2 mb-5">
                  <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600"><Database size={14} /></div>
                  Database Connection Info
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-600 space-y-1">
                    <div className="flex justify-between"><span className="font-bold text-slate-400">PostgreSQL</span><span className="badge badge-green text-[9px]">Via Prisma ORM</span></div>
                    <p className="text-slate-500">Configured via DATABASE_URL environment variable.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-600 space-y-1">
                    <div className="flex justify-between"><span className="font-bold text-slate-400">Neo4j Graph DB</span><span className="badge badge-slate text-[9px]">Optional</span></div>
                    <p className="text-slate-500">Configure NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in your .env file to switch from the local in-memory engine to a full Neo4j instance.</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700">
                    <strong>Note:</strong> Database credentials are managed server-side via environment variables for security. They cannot be changed from the UI.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-4 font-display flex items-center gap-2 mb-5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><Bell size={14} /></div>
                Notification Preferences
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Alert on Fraud & Circular Transaction Cycles', sub: 'Get notified when the graph engine detects suspicious loops', checked: notifyOnRisk, setter: setNotifyOnRisk },
                  { label: 'Alert on Graph Structural Changes', sub: 'Notify when nodes or relationships are added or deleted', checked: notifyOnGraph, setter: setNotifyOnGraph },
                  { label: 'Alert on New User Logins', sub: 'Get alerted when a new session begins on your account', checked: notifyOnLogin, setter: setNotifyOnLogin },
                ].map((item, i) => (
                  <label key={i} className="flex items-center justify-between cursor-pointer p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors select-none">
                    <div>
                      <span className="font-semibold text-slate-700 text-sm block">{item.label}</span>
                      <span className="text-xs text-slate-400 mt-0.5 block">{item.sub}</span>
                    </div>
                    <div className="relative shrink-0 ml-4">
                      <div
                        onClick={() => item.setter(!item.checked)}
                        className={`w-11 h-6 rounded-full border-2 transition-all duration-200 cursor-pointer relative ${item.checked ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 border-slate-200'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${item.checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <button onClick={showSuccess} className="btn-primary mt-4">
                <CheckCircle size={14} /> Save Preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
