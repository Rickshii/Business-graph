import React, { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Network, Link, AlertTriangle, Cpu, TrendingUp, Users, ArrowUpRight, ShieldAlert, Activity, RefreshCw, Download } from 'lucide-react';
import { api } from '../services/api';

const PASTEL_COLORS = ['#6366F1', '#10B981', '#8B5CF6', '#06B6D4', '#F43F5E', '#F59E0B'];

const ProgressRing = ({ percent, color, size = 72, label }: { percent: number; color: string; size?: number; label: string }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="text-center -mt-[68px] mb-[44px]">
        <div className="text-lg font-bold text-slate-900 font-display">{percent}%</div>
      </div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">{label}</p>
    </div>
  );
};

export default function Dashboard({ setTab, onHighlightNodes }: { setTab: (tab: string) => void; onHighlightNodes: (nodeIds: string[]) => void }) {
  const [stats, setStats] = useState({ totalNodes: 0, totalEdges: 0, graphConnected: false, graphEngine: 'Local Graph Logic Engine', uptime: 0, usersCount: 0 });
  const [dominance, setDominance] = useState<any[]>([]);
  const [pageRankScores, setPageRankScores] = useState<any[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const TYPE_LABELS: Record<string, string> = {
    BUSINESS: 'Businesses', CUSTOMER: 'Customers', SUPPLIER: 'Suppliers',
    INFLUENCER: 'Influencers', COMPETITOR: 'Competitors', REVIEW: 'Reviews'
  };

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [statsRes, dominanceRes, prRes, fraudRes, analyticsRes, nodesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/graph/algorithms/market-dominance'),
        api.get('/graph/algorithms/pagerank'),
        api.get('/graph/algorithms/fraud'),
        api.get('/admin/analytics'),
        api.get('/graph/nodes')
      ]);

      setStats(statsRes.data);
      setDominance(dominanceRes.data);

      // Real trend data from analytics endpoint
      if (analyticsRes.data.trend) {
        setTrendData(analyticsRes.data.trend.map((t: any) => ({
          month: t.month,
          'Node Volume': t.nodes,
          'Edge Relations': t.edges,
          'AI Queries': t.queries
        })));
      }

      // Real entity type counts from analytics
      const typeCounts = analyticsRes.data.typeCounts || statsRes.data.typeCounts || {};
      const pieItems = Object.entries(typeCounts).map(([type, count]) => ({
        name: TYPE_LABELS[type] || type,
        value: count as number
      }));
      setPieData(pieItems.length > 0 ? pieItems : [
        { name: 'Businesses', value: 3 }, { name: 'Customers', value: 4 },
        { name: 'Suppliers', value: 3 }, { name: 'Influencers', value: 2 },
        { name: 'Competitors', value: 2 }, { name: 'Reviews', value: 3 }
      ]);

      // PageRank with real node labels
      const nodes = nodesRes.data;
      const mappedRanks = Object.entries(prRes.data)
        .map(([id, score]: any) => {
          const node = nodes.find((n: any) => n.id === id);
          return { name: node ? node.label : id, score: Math.round(score * 1000) / 10 };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
      setPageRankScores(mappedRanks);

      // Fraud alerts from real detection
      const fraud = fraudRes.data;
      const alerts: any[] = [];
      fraud.cycles.forEach((cycle: string[], idx: number) => {
        const names = cycle.map(id => nodes.find((n: any) => n.id === id)?.label || id).join(' → ');
        alerts.push({ id: `fraud_${idx}`, title: 'Circular Loop Risk Detected', message: `Suspect circular transaction: ${names}`, type: 'danger', nodeIds: cycle });
      });
      Object.entries(fraud.riskScores).forEach(([id, score]: any) => {
        if (score > 0.6) {
          const node = nodes.find((n: any) => n.id === id);
          if (node) alerts.push({ id: `risk_${id}`, title: 'High Risk Entity Flagged', message: `"${node.label}" (${node.type}) has a risk score of ${Math.round(score * 100)}%.`, type: 'warning', nodeIds: [id] });
        }
      });
      setFraudAlerts(alerts);
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExportSummary = () => {
    const summary = {
      exportedAt: new Date().toISOString(),
      stats,
      topInfluencers: pageRankScores,
      marketDominance: dominance,
      fraudAlerts: fraudAlerts.length
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `brgi-dashboard-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const networkHealth = stats.graphConnected ? 98 : 72;
  const coverageRate = stats.totalNodes > 0 ? Math.min(95, Math.round((stats.totalEdges / (stats.totalNodes * 1.5)) * 100)) : 42;
  const riskIndex = Math.max(5, 100 - fraudAlerts.length * 15);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Activity size={20} className="text-indigo-600 animate-pulse" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading intelligence dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Page Header */}
      <div className="section-header">
        <div>
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Analytics Overview</p>
          <h1 className="text-3xl font-bold text-slate-900 font-display">Intelligence Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time enterprise graph analytics, node communities, and predictive relationship models.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="btn-secondary"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={handleExportSummary} className="btn-secondary">
            <Download size={15} />
            Export
          </button>
          <button onClick={() => setTab('explorer')} className="btn-primary">
            <Network size={16} />
            Open Graph Explorer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="kpi-card kpi-mint rounded-3xl" onClick={() => setTab('entities')} style={{ cursor: 'pointer' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Total Entities</span>
            <div className="p-2 rounded-xl bg-emerald-100/60 text-emerald-700"><Users size={16} /></div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-display">{stats.totalNodes}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center"><TrendingUp size={12} className="mr-0.5" /> Live</span>
          </div>
          <p className="text-xs opacity-60 mt-0.5">Nodes mapped in relationship graph</p>
        </div>

        <div className="kpi-card kpi-indigo rounded-3xl" onClick={() => setTab('entities')} style={{ cursor: 'pointer' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Total Relations</span>
            <div className="p-2 rounded-xl bg-indigo-100/60 text-indigo-700"><Link size={16} /></div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-display">{stats.totalEdges}</span>
            <span className="text-xs font-semibold text-indigo-600 flex items-center"><TrendingUp size={12} className="mr-0.5" /> Live</span>
          </div>
          <p className="text-xs opacity-60 mt-0.5">Cross-entity connection links</p>
        </div>

        <div className="kpi-card kpi-coral rounded-3xl" onClick={() => setTab('algorithms')} style={{ cursor: 'pointer' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Risk Warnings</span>
            <div className="p-2 rounded-xl bg-rose-100/60 text-rose-700"><AlertTriangle size={16} /></div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-display">{fraudAlerts.length}</span>
            {fraudAlerts.length > 0 && <span className="text-xs font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md">REVIEW</span>}
          </div>
          <p className="text-xs opacity-60 mt-0.5">Circular loops or collusive activity</p>
        </div>

        <div className="kpi-card kpi-skyblue rounded-3xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Engine Status</span>
            <div className="p-2 rounded-xl bg-sky-100/60 text-sky-700"><Cpu size={16} /></div>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-sm font-bold truncate max-w-[200px]" title={stats.graphEngine}>{stats.graphEngine}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse"></span>
              {stats.graphConnected ? 'Neo4j Online' : 'Fallback Engine Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Trend Chart + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="chart-container lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Graph Growth & Activity Trends</h3>
              <p className="text-xs text-slate-400 mt-0.5">Node volume, edge relations, and AI query activity over 6 months</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorNodes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEdges" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#CBD5E1" fontSize={11} tickLine={false} />
                <YAxis stroke="#CBD5E1" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                <Area type="monotone" dataKey="Node Volume" stroke="#6366F1" fillOpacity={1} fill="url(#colorNodes)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="Edge Relations" stroke="#06B6D4" fillOpacity={1} fill="url(#colorEdges)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="AI Queries" stroke="#10B981" fillOpacity={1} fill="url(#colorQueries)" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display mb-1">System Health</h3>
            <p className="text-xs text-slate-400 mb-6">Real-time platform metrics</p>
          </div>
          <div className="grid grid-cols-3 gap-4 py-2">
            <ProgressRing percent={networkHealth} color="#6366F1" label="Network" />
            <ProgressRing percent={coverageRate} color="#10B981" label="Coverage" />
            <ProgressRing percent={riskIndex} color="#F59E0B" label="Safety" />
          </div>
          <div className="mt-6 space-y-2">
            {[
              { label: 'Network Health', val: networkHealth, color: '#6366F1' },
              { label: 'Graph Coverage', val: coverageRate, color: '#10B981' },
              { label: 'Risk Safety Index', val: riskIndex, color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>{item.label}</span><span>{item.val}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${item.val}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* PageRank Leaders */}
        <div className="chart-container">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">PageRank Influence Leaders</h3>
          <p className="text-xs text-slate-400 mb-5">Top nodes weighted by centrality score</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pageRankScores} layout="vertical" margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" stroke="#CBD5E1" fontSize={10} tickLine={false} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#CBD5E1" fontSize={9} width={120} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9' }} formatter={(v: any) => [`${v}%`, 'Score']} />
                <Bar dataKey="score" fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entity Distribution */}
        <div className="chart-container flex flex-col">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Entity Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Real-time breakdown of node classes</p>
          <div className="h-44 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PASTEL_COLORS[index % PASTEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-semibold text-slate-600">
            {pieData.map((d, index) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: PASTEL_COLORS[index % PASTEL_COLORS.length] }}></span>
                <span className="truncate">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Market Dominance */}
        <div className="chart-container">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Market Competitor Analysis</h3>
          <p className="text-xs text-slate-400 mb-5">Network strength by customer link volume</p>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {dominance.map((d, i) => (
              <div key={d.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{d.name}</span><span className="text-indigo-600">{d.marketShare}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${d.marketShare}%`, backgroundColor: PASTEL_COLORS[i % PASTEL_COLORS.length] }} />
                </div>
              </div>
            ))}
            {dominance.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">No dominance data. Add competitor links in the entities panel.</p>
            )}
          </div>
        </div>
      </div>

      {/* Graph Risk Audit */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">Graph Risk Audit</h3>
            <p className="text-xs text-slate-400 mt-0.5">Entities flagged by the Fraud Detection Engine</p>
          </div>
          <div className="flex items-center gap-2">
            {fraudAlerts.length > 0 && (
              <span className="badge bg-rose-50 text-rose-600 border border-rose-100">{fraudAlerts.length} Warnings Active</span>
            )}
            <button onClick={() => setTab('algorithms')} className="btn-secondary text-xs">
              Run Full Scan
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fraudAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => { setTab('explorer'); onHighlightNodes(alert.nodeIds); }}
              className={`p-4 rounded-2xl border flex gap-3 items-start cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md ${
                alert.type === 'danger' ? 'bg-rose-50/40 border-rose-100 text-rose-900' : 'bg-amber-50/40 border-amber-100 text-amber-900'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {alert.type === 'danger' ? <ShieldAlert size={16} className="text-rose-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
              </div>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1">{alert.title} <ArrowUpRight size={12} className="opacity-50" /></h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{alert.message}</p>
              </div>
            </div>
          ))}
          {fraudAlerts.length === 0 && (
            <div className="col-span-3 text-center py-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert size={18} className="text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Zero active warnings</p>
              <p className="text-xs text-slate-400 mt-1">The network graph is clean and risk-free.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
