import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Activity, Database, AlertCircle, CheckCircle,
  RefreshCw, Trash2, Edit3, X, Check, Clock, Network,
  Bell, FileText, Search, ServerCrash, ShieldOff
} from 'lucide-react';
import { api, getSocket } from '../services/api';
import { MOCK_STATS, MOCK_AUDIT_LOGS, MOCK_NOTIFICATIONS } from '../services/mockData';

const ROLES = ['ADMIN', 'ANALYST', 'VIEWER'];
const STATUSES = ['ACTIVE', 'SUSPENDED'];
const ROLE_COLORS: Record<string, string> = { ADMIN: 'badge-red', ANALYST: 'badge-blue', VIEWER: 'badge-slate' };
const STATUS_COLORS: Record<string, string> = { ACTIVE: 'badge-green', SUSPENDED: 'badge-amber' };

function StatCard({ label, value, icon, color }: { label: string; value: any; icon: React.ReactNode; color: string }) {
  return (
    <div className={`card p-5 flex items-center gap-4 ${color}`}>
      <div className="p-3 rounded-2xl bg-white/60 text-current">{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-2xl font-bold font-display">{value}</p>
      </div>
    </div>
  );
}

export default function AdminPanel({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'notifications'>('overview');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteUser, setDeleteUser] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [reseeding, setReseeding] = useState(false);
  const [reseedMsg, setReseedMsg] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'INFO' });
  const [sendingNotif, setSendingNotif] = useState(false);

  // Role guard — block if not ADMIN
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center">
          <ShieldOff size={28} className="text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-xs">The Admin Panel is only accessible to users with the <strong>ADMIN</strong> role. Contact your administrator for access.</p>
      </div>
    );
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setUsersError(null);
    try {
      // Fetch users from real DB — no mock fallback
      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to load users from database.';
      setUsersError(msg);
      setUsers([]);
    }
    // Stats / logs / notifications can use mock fallback safely
    try {
      const [statsRes, logsRes, notifsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/logs'),
        api.get('/admin/notifications')
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data);
      setNotifications(notifsRes.data);
    } catch {
      setStats(MOCK_STATS);
      setLogs(MOCK_AUDIT_LOGS);
      setNotifications(MOCK_NOTIFICATIONS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Real-time: auto-append newly registered users
  useEffect(() => {
    const socket = getSocket();
    const onUserRegistered = (newUser: any) => {
      setUsers(prev => {
        // Avoid duplicates
        if (prev.some(u => u.id === newUser.id)) return prev;
        return [newUser, ...prev];
      });
    };
    socket.on('user:registered', onUserRegistered);
    return () => { socket.off('user:registered', onUserRegistered); };
  }, []);

  const handleReseed = async () => {
    setReseeding(true); setReseedMsg('');
    try {
      await api.post('/graph/reset');
      setReseedMsg('Graph successfully reset to default 17-node sample dataset.');
      await fetchAll();
    } catch {
      console.warn('Backend offline — simulating graph reseed locally.');
      setReseedMsg('Graph successfully reset to default mock dataset (local simulation).');
      // Append a local audit log
      const newLog = {
        id: `local_l_${Date.now()}`,
        action: 'GRAPH_RESET',
        details: 'Graph database successfully reseeded to defaults (local simulation).',
        createdAt: new Date().toISOString(),
        user: { name: 'Administrator', email: 'admin@brgi.com' }
      };
      setLogs(prev => [newLog, ...prev]);
    } finally { setReseeding(false); }
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    setSavingUser(true);
    setSaveError('');
    try {
      const res = await api.put(`/admin/users/${editUser.id}`, {
        name: editName,
        role: editRole,
        status: editStatus,
        phone: editPhone,
        company: editCompany
      });
      setUsers(prev => prev.map(u => u.id === editUser.id ? res.data : u));
      setEditUser(null);
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || 'Database update failed. Please try again.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleStatus = async (u: any) => {
    const newStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionError('');
    try {
      const res = await api.put(`/admin/users/${u.id}`, { status: newStatus });
      setUsers(prev => prev.map(x => x.id === u.id ? res.data : x));
    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed to update status in database.');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    setActionError('');
    try {
      await api.delete(`/admin/users/${deleteUser.id}`);
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      setDeleteUser(null);
    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed to delete user from database.');
      setDeleteUser(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSendNotif = async () => {
    if (!newNotif.title || !newNotif.message) return;
    setSendingNotif(true);
    try {
      const res = await api.post('/admin/notifications', newNotif);
      setNotifications(prev => [res.data, ...prev]);
    } catch {
      console.warn('Backend offline — broadcasting notification locally.');
      const localNotif = {
        id: `local_notif_${Date.now()}`,
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type,
        read: false,
        createdAt: new Date().toISOString()
      };
      setNotifications(prev => [localNotif, ...prev]);
    } finally {
      setNewNotif({ title: '', message: '', type: 'INFO' });
      setSendingNotif(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/admin/notifications/read-all');
    } catch {
      console.warn('Backend offline — marking all notifications read locally.');
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredUsers = users.filter(u => {
    const searchLower = userSearch.toLowerCase();
    const matchesSearch = !userSearch ||
      u.name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.phone?.toLowerCase().includes(searchLower) ||
      u.company?.toLowerCase().includes(searchLower) ||
      u.role?.toLowerCase().includes(searchLower);

    const matchesRole = !userRoleFilter || u.role === userRoleFilter;
    const matchesStatus = !userStatusFilter || u.status === userStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, userRoleFilter, userStatusFilter]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={15} /> },
    { id: 'users', label: `Users (${users.length})`, icon: <Users size={15} /> },
    { id: 'logs', label: 'Audit Logs', icon: <FileText size={15} /> },
    { id: 'notifications', label: `Notifications (${notifications.filter(n => !n.read).length})`, icon: <Bell size={15} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={20} className="text-indigo-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Loading admin panel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Administration</p>
          <h1 className="text-3xl font-bold text-slate-900 font-display">Admin Panel</h1>
          <p className="text-sm text-slate-400 mt-1">Manage users, monitor system health, audit logs, and notifications.</p>
        </div>
        <button onClick={() => fetchAll()} className="btn-secondary"><RefreshCw size={15} /> Refresh</button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-full overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-soft-sm' : 'text-slate-400 hover:text-slate-700'}`}>
            {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Entities" value={stats.totalNodes} icon={<Network size={18} />} color="kpi-mint" />
            <StatCard label="Relationships" value={stats.totalEdges} icon={<Activity size={18} />} color="kpi-indigo" />
            <StatCard label="Registered Users" value={stats.usersCount} icon={<Users size={18} />} color="kpi-skyblue" />
            <StatCard label="Uptime" value={`${Math.floor(stats.uptime / 60)}m`} icon={<Clock size={18} />} color="kpi-lavender" />
          </div>

          {/* Engine Status */}
          <div className="card p-5 flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${stats.graphConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
            <div>
              <p className="text-sm font-bold text-slate-900">{stats.graphEngine}</p>
              <p className="text-xs text-slate-400">{stats.graphConnected ? 'Neo4j Graph Database is online and connected.' : 'Running on in-memory fallback engine. Configure NEO4J_URI to enable.'}</p>
            </div>
          </div>

          {/* Entity Type Breakdown */}
          {stats.typeCounts && Object.keys(stats.typeCounts).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Entity Type Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(stats.typeCounts).map(([type, count]: any) => (
                  <div key={type} className="text-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-2xl font-bold text-slate-900 font-display">{count}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graph Actions */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Graph Engine Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleReseed} disabled={reseeding} className="btn-danger">
                {reseeding ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                {reseeding ? 'Reseeding...' : 'Reset & Reseed Graph'}
              </button>
            </div>
            {reseedMsg && (
              <p className={`text-xs p-3 rounded-xl border font-medium ${reseedMsg.includes('success') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                {reseedMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-slide-up">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, phone, company..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="input !pl-9 !py-2 text-xs w-full"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="input !py-1.5 px-3 text-xs flex-1 min-w-[110px] bg-white"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="ANALYST">ANALYST</option>
                <option value="VIEWER">VIEWER</option>
              </select>
              <select
                value={userStatusFilter}
                onChange={e => setUserStatusFilter(e.target.value)}
                className="input !py-1.5 px-3 text-xs flex-1 min-w-[110px] bg-white"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          {/* DB Error banner */}
          {usersError && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700">
              <ServerCrash size={18} className="shrink-0" />
              <div>
                <p className="text-xs font-bold">Failed to load users from database</p>
                <p className="text-xs opacity-80 mt-0.5">{usersError}</p>
              </div>
              <button onClick={() => fetchAll()} className="ml-auto btn-secondary !py-1 !px-2.5 text-xs text-rose-700 border-rose-200">
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {/* Action error banner */}
          {actionError && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700">
              <AlertCircle size={15} className="shrink-0" />
              <p className="text-xs font-semibold flex-1">{actionError}</p>
              <button onClick={() => setActionError('')} className="text-rose-400 hover:text-rose-700"><X size={14} /></button>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-x-auto shadow-soft-sm rounded-2xl border border-slate-100 bg-white">
            <table className="data-table" style={{ minWidth: '860px' }}>
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone Number</th>
                  <th>Company Name</th>
                  <th>Registration Date</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <span className="truncate max-w-[150px]" title={user.name}>{user.name}</span>
                      </div>
                    </td>
                    <td className="text-xs text-slate-500 font-medium">{user.email}</td>
                    <td>
                      <span className={`badge ${ROLE_COLORS[user.role] || 'badge-slate'} text-[9px] font-extrabold px-2 py-0.5`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500 font-mono">{user.phone || '—'}</td>
                    <td className="text-xs text-slate-600 font-semibold truncate max-w-[120px]" title={user.company}>{user.company || '—'}</td>
                    <td className="text-xs text-slate-400 font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[user.status] || 'badge-slate'} text-[9px] font-extrabold px-2 py-0.5`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-400 font-medium">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            user.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={user.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                        >
                          {user.status === 'ACTIVE' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            setEditUser(user);
                            setEditRole(user.role);
                            setEditStatus(user.status);
                            setEditName(user.name || '');
                            setEditPhone(user.phone || '');
                            setEditCompany(user.company || '');
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
                          title="Edit Profile"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && !usersError && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 text-sm font-medium">
                      {users.length === 0 ? 'No users found in the database yet.' : 'No users match your current filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 pt-4 px-1">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of{' '}
                <span className="font-semibold text-slate-700">{filteredUsers.length}</span> users
              </p>
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary !py-1 !px-2.5 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-[11px] text-slate-500 font-bold px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary !py-1 !px-2.5 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Audit Logs ── */}
      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Audit Trail</h3>
            <span className="badge badge-slate">{logs.length} entries</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto scrollbar-thin">
            {logs.map((log: any) => (
              <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/30 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Activity size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">{log.action}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                  {log.user && <p className="text-[10px] text-indigo-500 mt-0.5">by {log.user.name || log.user.email}</p>}
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-center py-10 text-sm text-slate-400">No audit logs yet.</p>}
          </div>
        </div>
      )}

      {/* ── Notifications ── */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Create Notification */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Broadcast Notification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" placeholder="Title" value={newNotif.title} onChange={e => setNewNotif(p => ({ ...p, title: e.target.value }))} className="input text-xs" />
              <input type="text" placeholder="Message" value={newNotif.message} onChange={e => setNewNotif(p => ({ ...p, message: e.target.value }))} className="input text-xs" />
              <select value={newNotif.type} onChange={e => setNewNotif(p => ({ ...p, type: e.target.value }))} className="input text-xs">
                {['INFO', 'SUCCESS', 'WARNING', 'ALERT'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSendNotif} disabled={sendingNotif} className="btn-primary text-xs">
                {sendingNotif ? <RefreshCw size={13} className="animate-spin" /> : <Bell size={13} />}
                Send Notification
              </button>
              <button onClick={handleMarkAllRead} className="btn-secondary text-xs">Mark All Read</button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="card overflow-hidden">
            <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto scrollbar-thin">
              {notifications.map((n: any) => (
                <div key={n.id} className={`p-4 flex items-start gap-3 transition-colors ${n.read ? '' : 'bg-indigo-50/30'}`}>
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? 'bg-slate-200' : 'bg-indigo-500 animate-pulse'}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{n.title}</span>
                      <span className={`badge text-[9px] ${n.type === 'SUCCESS' ? 'badge-green' : n.type === 'WARNING' ? 'badge-amber' : n.type === 'ALERT' ? 'badge-red' : 'badge-blue'}`}>{n.type}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-center py-10 text-sm text-slate-400">No notifications.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-display">Edit User Profile</h2>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="input text-sm"
                  placeholder="Full Name"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="input text-sm"
                  placeholder="Phone Number"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Company</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={e => setEditCompany(e.target.value)}
                  className="input text-sm"
                  placeholder="Company"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Role</label>
                  <select value={editRole} onChange={e => setEditRole(e.target.value)} className="input text-sm">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="input text-sm">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {saveError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-2.5 font-semibold">{saveError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setEditUser(null); setSaveError(''); }} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleSaveUser} disabled={savingUser} className="btn-primary flex-1 justify-center">
                {savingUser ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirm */}
      {deleteUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center"><Trash2 size={18} className="text-rose-600" /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete User</h3>
                <p className="text-xs text-slate-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs bg-slate-50 rounded-xl p-3 border border-slate-100">Delete <strong>{deleteUser.name}</strong> ({deleteUser.email})?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteUser(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleDeleteUser} className="btn-danger flex-1 justify-center"><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
