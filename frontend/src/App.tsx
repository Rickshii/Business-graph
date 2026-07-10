import React, { useState, useEffect, useCallback } from 'react';
import { 
  Network, LayoutDashboard, Database, 
  Settings as SettingsIcon, ShieldCheck, LogOut, Menu, 
  Bell, Search, User, X, MessageSquare, FileBarChart2, RefreshCw,
  KeyRound, Mail, ArrowLeft, CheckCircle2, Eye, EyeOff
} from 'lucide-react';
import { api, getSocket } from './services/api';

// ── Local mock users (used as fallback when backend is offline) ──────────────
const DEFAULT_MOCK_USERS = [
  { id: 'u_admin',   email: 'admin@brgi.com',   password: 'admin123',   name: 'Administrator', role: 'ADMIN'   },
  { id: 'u_analyst', email: 'analyst@brgi.com', password: 'analyst123', name: 'Sarah Connor',  role: 'ANALYST' },
  { id: 'u_viewer',  email: 'viewer@brgi.com',  password: 'viewer123',  name: 'John Doe',      role: 'VIEWER'  },
];

// Merges built-in demo accounts with any locally-registered accounts
const getLocalUsers = () => {
  try { return [...DEFAULT_MOCK_USERS, ...JSON.parse(localStorage.getItem('brgi_local_users') || '[]')]; }
  catch { return DEFAULT_MOCK_USERS; }
};

const saveLocalUser = (user: any) => {
  try {
    const existing = JSON.parse(localStorage.getItem('brgi_local_users') || '[]');
    localStorage.setItem('brgi_local_users', JSON.stringify([...existing, user]));
  } catch {}
};

const makeMockToken = (user: any) => btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, name: user.name }));
const parseMockToken = (token: string) => { try { return JSON.parse(atob(token)); } catch { return null; } };

// Pages
import Dashboard from './pages/Dashboard';
import GraphExplorer from './pages/GraphExplorer';
import Entities from './pages/Entities';
import Algorithms from './pages/Algorithms';
import AIChat from './pages/AIChat';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('brgi_token'));
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);

  // Auth states — mode: 'login' | 'register' | 'forgot' | 'reset'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [isLogin, setIsLogin] = useState(true); // kept for legacy compat
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('ANALYST');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Forgot / Reset password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);


  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load user — try real API first, fall back to localStorage/mock token
  useEffect(() => {
    if (token) {
      const cached = localStorage.getItem('brgi_user');
      if (cached) { try { setUser(JSON.parse(cached)); } catch {} }
      api.get('/auth/me')
        .then(res => { setUser(res.data.user); localStorage.setItem('brgi_user', JSON.stringify(res.data.user)); })
        .catch(() => {
          // Backend offline — try to decode mock token
          const decoded = parseMockToken(token);
          if (decoded) { setUser(decoded); }
          else { handleLogout(); }
        });
    }
  }, [token]);

  // Redirect non-admin users away from the admin tab
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && activeTab === 'admin') {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

  // Load notifications from API
  useEffect(() => {
    if (token) {
      api.get('/admin/notifications')
        .then(res => setNotifications(res.data || []))
        .catch(() => {
          setNotifications([{ id: '1', title: 'Welcome to BRGI', message: 'Business Relationship Graph Intelligence is ready.', read: false, createdAt: new Date(), type: 'INFO' }]);
        });
    }
  }, [token]);

  // Socket.IO
  useEffect(() => {
    if (token) {
      const socket = getSocket();

      socket.on('graph:changed', (data: any) => {
        setNotifications(prev => [{
          id: `notif_${Date.now()}`, title: 'Graph Modified',
          message: data.message || 'Structural updates performed.', read: false, createdAt: new Date(), type: 'INFO'
        }, ...prev]);
      });

      socket.on('risk:flagged', (data: any) => {
        setNotifications(prev => [{
          id: `notif_${Date.now()}`, title: 'Fraud Alert Raised',
          message: data.message || 'Suspect circular loop detected.', read: false, createdAt: new Date(), type: 'ALERT'
        }, ...prev]);
      });

      return () => { socket.off('graph:changed'); socket.off('risk:flagged'); };
    }
  }, [token]);

  // Global search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]); setShowSearchResults(false); return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/graph/nodes/search', { params: { q: searchQuery, type: 'ALL' } });
        setSearchResults(res.data.slice(0, 8));
        setShowSearchResults(true);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(''); setAuthLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('brgi_token', res.data.token);
        localStorage.setItem('brgi_user', JSON.stringify(res.data.user));
        setToken(res.data.token); setUser(res.data.user);
      } else {
        const res = await api.post('/auth/register', { email, password, name, role, phone, company });
        localStorage.setItem('brgi_token', res.data.token);
        localStorage.setItem('brgi_user', JSON.stringify(res.data.user));
        setToken(res.data.token); setUser(res.data.user);
      }
    } catch (err: any) {
      const isNetworkErr = !err.response && (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED');
      if (isNetworkErr && isLogin) {
        // Backend offline — try local users (demo + registered)
        const mockUser = getLocalUsers().find(u => u.email === email && u.password === password);
        if (mockUser) {
          const { password: _, ...safeUser } = mockUser;
          const mockToken = makeMockToken(safeUser);
          localStorage.setItem('brgi_token', mockToken);
          localStorage.setItem('brgi_user', JSON.stringify(safeUser));
          setToken(mockToken); setUser(safeUser);
        } else {
          setAuthError('Invalid email or password.');
        }
      } else if (isNetworkErr && !isLogin) {
        // Backend offline — register locally
        const allUsers = getLocalUsers();
        if (allUsers.find(u => u.email === email)) {
          setAuthError('An account with this email already exists.');
        } else {
          const newUser = { id: `u_${Date.now()}`, email, password, name, role, phone, company };
          saveLocalUser(newUser);
          const { password: _, ...safeUser } = newUser;
          const mockToken = makeMockToken(safeUser);
          localStorage.setItem('brgi_token', mockToken);
          localStorage.setItem('brgi_user', JSON.stringify(safeUser));
          setToken(mockToken); setUser(safeUser);
        }
      } else {
        setAuthError(err.response?.data?.error || err.message || 'Authentication failed. Check credentials.');
      }
    } finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('brgi_token');
    localStorage.removeItem('brgi_user');
    setToken(null); setUser(null);
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser);
    localStorage.setItem('brgi_user', JSON.stringify(updatedUser));
  };

  // ── Forgot Password ────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return setAuthError('Please enter your email address.');
    if (!newPw || newPw.length < 6) return setAuthError('New password must be at least 6 characters.');
    if (newPw !== confirmPw) return setAuthError('Passwords do not match.');

    setAuthLoading(true); setAuthError(''); setAuthSuccess('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim(), newPassword: newPw });
      setAuthSuccess(res.data.message || 'Password updated successfully! You can now log in.');
      setForgotEmail(''); setNewPw(''); setConfirmPw('');
      // Redirect to login after 2.5 seconds
      setTimeout(() => { setAuthMode('login'); setAuthSuccess(''); setAuthError(''); }, 2500);
    } catch (err: any) {
      const isNetworkErr = !err.response && (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED');
      if (isNetworkErr) {
        // Backend offline — try local users (demo + registered)
        const allUsers = getLocalUsers();
        const userIndex = allUsers.findIndex(u => u.email === forgotEmail.trim());
        if (userIndex !== -1) {
          const updatedUser = { ...allUsers[userIndex], password: newPw };
          const existingLocal = JSON.parse(localStorage.getItem('brgi_local_users') || '[]');
          const localIndex = existingLocal.findIndex((u: any) => u.email === forgotEmail.trim());
          if (localIndex !== -1) {
            existingLocal[localIndex].password = newPw;
            localStorage.setItem('brgi_local_users', JSON.stringify(existingLocal));
          } else {
            localStorage.setItem('brgi_local_users', JSON.stringify([...existingLocal, updatedUser]));
          }
          setAuthSuccess('Password updated successfully! (Local Mode)');
          setForgotEmail(''); setNewPw(''); setConfirmPw('');
          setTimeout(() => { setAuthMode('login'); setAuthSuccess(''); setAuthError(''); }, 2500);
        } else {
          setAuthError('Email address not found.');
        }
      } else {
        setAuthError(err.response?.data?.error || 'Could not reset password. Try again.');
      }
    } finally { setAuthLoading(false); }
  };


  const handleHighlightNodes = (nodeIds: string[]) => {
    setHighlightedNodeIds(nodeIds);
    setActiveTab('explorer');
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail); setPassword(quickPass); setIsLogin(true);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/admin/notifications/read-all');
    } catch { }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const TYPE_COLORS: Record<string, string> = {
    BUSINESS: '#6366F1', CUSTOMER: '#10B981', SUPPLIER: '#8B5CF6',
    INFLUENCER: '#06B6D4', COMPETITOR: '#F43F5E', REVIEW: '#F59E0B'
  };

  // ─── Auth Screen (Login / Register / Forgot / Reset) ─────────────────────
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6 animate-fade-in font-sans">
        <div className="card max-w-md w-full p-8 space-y-6 relative overflow-hidden shadow-soft-lg rounded-3xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-cyan-400"></div>

          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
              {authMode === 'forgot' ? <KeyRound size={28} /> : <Network size={28} className="animate-pulse-slow" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              {authMode === 'forgot' ? 'Reset Password' : 'Graph Intelligence'}
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {authMode === 'forgot' ? 'Choose a new secure password' : 'Enterprise Relationship Analytics'}
            </p>
          </div>

          {/* Alerts */}
          {authError && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">{authError}</p>}
          {authSuccess && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
              <CheckCircle2 size={14} className="shrink-0" />
              {authSuccess}
            </div>
          )}

          {/* ── LOGIN / REGISTER form ── */}
          {(authMode === 'login' || authMode === 'register') && (
            <>
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Sarah Connor" className="input" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="analyst@brgi.com" className="input" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Password</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" className="input" />
                </div>
                {authMode === 'register' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone Number (Optional)</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className="input" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company (Optional)</label>
                      <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corporation" className="input" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Role Privilege</label>
                      <select value={role} onChange={e => setRole(e.target.value)} className="input">
                        <option value="ADMIN">ADMIN — Full access &amp; database control</option>
                        <option value="ANALYST">ANALYST — Entity modification</option>
                        <option value="VIEWER">VIEWER — Read-only insights</option>
                      </select>
                    </div>
                  </>
                )}
                <button type="submit" disabled={authLoading} className="btn-primary w-full justify-center !py-3">
                  {authLoading ? <RefreshCw size={16} className="animate-spin" /> : null}
                  {authLoading ? 'Authenticating...' : (authMode === 'login' ? 'Authenticate Access' : 'Register Account')}
                </button>
              </form>

              {/* Forgot password link */}
              {authMode === 'login' && (
                <div className="text-center -mt-2">
                  <button
                    onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); setForgotEmail(email); }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold cursor-pointer hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              {/* Demo accounts */}
              {authMode === 'login' && (
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Demo Accounts</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { role: 'ADMINISTRATOR', email: 'admin@brgi.com', pass: 'admin123', color: 'text-indigo-600' },
                      { role: 'ANALYST', email: 'analyst@brgi.com', pass: 'analyst123', color: 'text-emerald-600' }
                    ].map(acc => (
                      <button key={acc.email} onClick={() => handleQuickLogin(acc.email, acc.pass)}
                        className="p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:-translate-y-0.5 shadow-soft-sm hover:shadow-soft-md text-left text-[10px] font-bold text-slate-700 block cursor-pointer transition-all duration-200">
                        <div className={acc.color}>{acc.role}</div>
                        <div className="text-slate-400 truncate">{acc.email}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center pt-1">
                <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setIsLogin(authMode !== 'login'); setAuthError(''); setAuthSuccess(''); }}
                  className="text-xs text-slate-400 font-bold hover:text-slate-600 cursor-pointer">
                  {authMode === 'login' ? 'Need a new account? Register' : 'Already have an account? Sign In'}
                </button>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD form ── */}
          {authMode === 'forgot' && (
            <>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Your Account Email</label>
                  <input
                    type="email" required value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="analyst@brgi.com" className="input" autoFocus
                  />
                </div>
                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                  <input
                    type={showNewPw ? 'text' : 'password'} required value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Minimum 6 characters" className="input pr-10"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-700 cursor-pointer">
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirm New Password</label>
                  <input
                    type={showConfirmPw ? 'text' : 'password'} required value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Repeat your new password" className="input pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-700 cursor-pointer">
                    {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Password strength bar */}
                {newPw && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          newPw.length >= i * 3
                            ? i <= 1 ? 'bg-rose-400' : i === 2 ? 'bg-amber-400' : i === 3 ? 'bg-blue-400' : 'bg-emerald-500'
                            : 'bg-slate-100'
                        }`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {newPw.length < 6 ? 'Too short' : newPw.length < 9 ? 'Fair' : newPw.length < 12 ? 'Good' : 'Strong'}
                    </p>
                  </div>
                )}
                {newPw && confirmPw && newPw !== confirmPw && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">Passwords do not match</p>
                )}
                <button type="submit" disabled={authLoading || !!(authSuccess)} className="btn-primary w-full justify-center !py-3">
                  {authLoading ? <RefreshCw size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  {authLoading ? 'Updating...' : authSuccess ? 'Redirecting to login...' : 'Update Password'}
                </button>
              </form>

              {!authSuccess && (
                <div className="text-center pt-1">
                  <button onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); setForgotEmail(''); setNewPw(''); setConfirmPw(''); }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 font-bold hover:text-slate-600 cursor-pointer mx-auto">
                    <ArrowLeft size={12} /> Back to Login
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'explorer', label: 'Graph Explorer', icon: <Network size={18} /> },
    { id: 'entities', label: 'Directory Manager', icon: <Database size={18} /> },
    { id: 'algorithms', label: 'Algorithms Panel', icon: <ShieldCheck size={18} /> },
    { id: 'aichat', label: 'AI QA Chat', icon: <MessageSquare size={18} /> },
    { id: 'reports', label: 'Reports', icon: <FileBarChart2 size={18} /> },
    { id: 'admin', label: 'Admin Panel', icon: <User size={18} />, requireAdmin: true },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> }
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans">
      {/* Mobile Sidebar Overlay Backdrop */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30 lg:hidden" 
          onClick={() => setSidebarCollapsed(true)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0"><Network size={20} /></div>
            {!sidebarCollapsed && <span className="font-bold text-sm text-slate-900 tracking-tight font-display whitespace-nowrap">BRGI Intelligence</span>}
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto scrollbar-thin">
          {navItems.map(item => {
            if (item.requireAdmin && user.role !== 'ADMIN') return null;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); if (item.id !== 'explorer') setHighlightedNodeIds([]); if (window.innerWidth < 1024) setSidebarCollapsed(true); }}
                title={item.label}
                className={activeTab === item.id ? 'nav-item-active w-full' : 'nav-item w-full'}>
                <div className="shrink-0">{item.icon}</div>
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {user.name?.charAt(0) || '?'}
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate leading-none">{user.name}</p>
                <span className="badge badge-slate text-[8px] px-1 py-0.5 mt-1 font-extrabold">{user.role}</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Topbar */}
      <header className={`topbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-500 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
              <Menu size={18} />
            </button>
            {/* Global Search */}
            <div className="max-w-md w-32 sm:w-48 md:w-80 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { setActiveTab('aichat'); setShowSearchResults(false); } if (e.key === 'Escape') { setSearchQuery(''); setShowSearchResults(false); } }}
                className="input !py-1.5 !pl-9 !pr-8"
              />
              {searching && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              {searchQuery && !searching && (
                <button onClick={() => { setSearchQuery(''); setShowSearchResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={12} />
                </button>
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-soft-lg z-50 overflow-hidden animate-fade-in">
                  <div className="p-2 border-b border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Graph Entities ({searchResults.length})</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-thin">
                    {searchResults.map(node => (
                      <button key={node.id}
                        onClick={() => { handleHighlightNodes([node.id]); setSearchQuery(''); setShowSearchResults(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left cursor-pointer">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${TYPE_COLORS[node.type]}20` }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[node.type] }}></div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{node.label}</p>
                          <p className="text-[10px] text-slate-400">{node.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-50">
                    <button onClick={() => { setActiveTab('entities'); setShowSearchResults(false); }} className="w-full text-[10px] font-bold text-indigo-600 text-center py-1 hover:underline cursor-pointer">
                      View all in Directory Manager →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="text-slate-500 hover:text-slate-900 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer relative transition-all">
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white border border-slate-100 rounded-2xl shadow-soft-lg p-4 space-y-3 z-50 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-900 font-display">Notifications</span>
                    <button onClick={handleMarkAllRead} className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer">Mark all read</button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                    {notifications.slice(0, 10).map(n => (
                      <div key={n.id} className={`p-2.5 rounded-xl text-xs space-y-1 ${n.read ? 'bg-slate-50/50' : 'bg-indigo-50/20 border border-indigo-50'}`}>
                        <div className="flex justify-between font-bold text-slate-900">
                          <span className="truncate">{n.title}</span>
                          <span className="text-[9px] text-slate-400 font-semibold shrink-0 ml-2">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">{n.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && <p className="text-[11px] text-slate-400 text-center py-6">No notifications yet.</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-[1px] bg-slate-200"></div>

            <button onClick={() => setActiveTab('settings')} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                {user.name?.charAt(0) || '?'}
              </div>
              <span className="text-xs font-bold text-slate-700 hidden md:inline">{user.name}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Click-away to close dropdowns */}
      {(showNotifications || showSearchResults) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowNotifications(false); setShowSearchResults(false); }} />
      )}

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {activeTab === 'dashboard' && <Dashboard setTab={setActiveTab} onHighlightNodes={handleHighlightNodes} />}
        {activeTab === 'explorer' && <GraphExplorer highlightedNodeIds={highlightedNodeIds} onClearHighlights={() => setHighlightedNodeIds([])} />}
        {activeTab === 'entities' && <Entities initialType="BUSINESS" setTab={setActiveTab} onHighlightNodes={handleHighlightNodes} />}
        {activeTab === 'algorithms' && <Algorithms initialAlgo="PAGERANK" setTab={setActiveTab} onHighlightNodes={handleHighlightNodes} />}
        {activeTab === 'aichat' && <AIChat setTab={setActiveTab} onHighlightNodes={handleHighlightNodes} />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'admin' && user?.role === 'ADMIN' && <AdminPanel user={user} />}
        {activeTab === 'settings' && <Settings onUserUpdate={handleUserUpdate} />}
      </main>
    </div>
  );
}
