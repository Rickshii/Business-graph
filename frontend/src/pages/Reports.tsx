import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Download, RefreshCw, ShieldAlert, TrendingUp, Users, Network,
  AlertTriangle, FileText, Activity, Award, Star
} from 'lucide-react';
import { api } from '../services/api';
import { MOCK_REPORT } from '../services/mockData';

const COLORS = ['#6366F1', '#10B981', '#8B5CF6', '#06B6D4', '#F43F5E', '#F59E0B'];

export default function Reports() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/summary');
      setReport(res.data);
    } catch (e) {
      console.warn('Backend offline — loading mock report summary.');
      setReport(MOCK_REPORT);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await api.get('/reports/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `brgi-report-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { }
    finally { setExporting(false); }
  };

  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `brgi-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={20} className="text-indigo-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Generating intelligence report...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle size={32} className="text-amber-400" />
        <p className="text-slate-500 font-medium">Report generation failed. Check backend connection.</p>
        <button onClick={fetchReport} className="btn-primary"><RefreshCw size={14} /> Retry</button>
      </div>
    );
  }

  const typeData = Object.entries(report.typeCounts || {}).map(([name, value]) => ({ name, value }));
  const influencerData = (report.topInfluencers || []).slice(0, 6);
  const marketData = (report.marketDominance || []).slice(0, 6);
  const radarData = [
    { subject: 'Network Health', value: report.overview?.totalEdges > 0 ? 85 : 50 },
    { subject: 'Entity Coverage', value: Math.min(100, (report.overview?.totalNodes || 0) * 6) },
    { subject: 'Risk Safety', value: Math.max(10, 100 - (report.overview?.highRiskCount || 0) * 15) },
    { subject: 'Community Cohesion', value: Math.min(100, (report.overview?.communityCount || 0) * 25) },
    { subject: 'Supply Chain', value: 78 },
    { subject: 'Partnership Score', value: 65 }
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Intelligence Reports</p>
          <h1 className="text-3xl font-bold text-slate-900 font-display">Graph Intelligence Report</h1>
          <p className="text-sm text-slate-400 mt-1">
            Generated: {new Date(report.generatedAt).toLocaleString()} · Comprehensive network analysis
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchReport} className="btn-secondary"><RefreshCw size={14} /> Regenerate</button>
          <button onClick={handleExportJSON} className="btn-secondary"><Download size={14} /> JSON</button>
          <button onClick={handleExportCSV} disabled={exporting} className="btn-secondary">
            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} CSV
          </button>
          <button onClick={handlePrint} className="btn-primary"><FileText size={14} /> Print / PDF</button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Entities', value: report.overview.totalNodes, color: 'kpi-mint', icon: <Network size={16} /> },
          { label: 'Relationships', value: report.overview.totalEdges, color: 'kpi-indigo', icon: <Activity size={16} /> },
          { label: 'High Risk Entities', value: report.overview.highRiskCount, color: 'kpi-coral', icon: <ShieldAlert size={16} /> },
          { label: 'Fraud Cycles', value: report.overview.totalCycles, color: 'kpi-coral', icon: <AlertTriangle size={16} /> },
          { label: 'Communities', value: report.overview.communityCount, color: 'kpi-skyblue', icon: <Users size={16} /> },
          { label: 'Top Influencers', value: report.topInfluencers?.length || 0, color: 'kpi-lavender', icon: <Star size={16} /> },
        ].map(kpi => (
          <div key={kpi.label} className={`kpi-card ${kpi.color} rounded-2xl p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{kpi.label}</span>
              <div className="opacity-60">{kpi.icon}</div>
            </div>
            <div className="text-3xl font-bold font-display mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Influence Ranking Bar */}
        <div className="chart-container lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Top 6 Influence Leaders (PageRank)</h3>
          <p className="text-xs text-slate-400 mb-5">Entities with highest structural centrality in the network</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={influencerData} layout="vertical" margin={{ left: -10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" stroke="#CBD5E1" fontSize={10} tickLine={false} unit="%" />
                <YAxis dataKey="label" type="category" stroke="#CBD5E1" fontSize={9} width={140} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9' }} formatter={(v: any) => [`${v}%`, 'Score']} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={12}>
                  {influencerData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entity Distribution Donut */}
        <div className="chart-container">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Entity Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Node type breakdown in the graph</p>
          <div className="h-52 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {typeData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="truncate font-semibold">{d.name}: {d.value as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Network Radar */}
        <div className="chart-container">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Network Health Radar</h3>
          <p className="text-xs text-slate-400 mb-4">Multi-dimensional graph quality scores</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#F1F5F9" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#CBD5E1' }} />
                <Radar name="Score" dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Dominance */}
        <div className="chart-container">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Market Dominance</h3>
          <p className="text-xs text-slate-400 mb-5">Customer link share by business entity</p>
          <div className="space-y-3">
            {marketData.map((d: any, i: number) => (
              <div key={d.name} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="truncate">{d.name}</span>
                  <span className="text-indigo-600 shrink-0">{d.marketShare}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${d.marketShare}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
            {marketData.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No market data available.</p>}
          </div>
        </div>

        {/* High Risk Table */}
        <div className="chart-container">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">High Risk Entities</h3>
          <p className="text-xs text-slate-400 mb-4">Entities flagged by fraud detection</p>
          <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-thin">
            {(report.highRiskEntities || []).slice(0, 8).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-2.5 bg-rose-50/50 rounded-xl border border-rose-100/60">
                <div>
                  <p className="text-xs font-bold text-slate-800">{e.label}</p>
                  <p className="text-[10px] text-slate-400">{e.type}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${e.riskScore > 70 ? 'bg-rose-500' : 'bg-amber-400'}`}></div>
                  <span className={`text-xs font-bold ${e.riskScore > 70 ? 'text-rose-600' : 'text-amber-600'}`}>{e.riskScore}%</span>
                </div>
              </div>
            ))}
            {(report.highRiskEntities || []).length === 0 && (
              <div className="text-center py-6">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                  <ShieldAlert size={16} className="text-emerald-500" />
                </div>
                <p className="text-xs text-slate-400">Network is clean — no high-risk entities.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fraud Cycles */}
      {report.fraudCycles?.length > 0 && (
        <div className="chart-container">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Detected Circular Transaction Loops</h3>
              <p className="text-xs text-slate-400">Potential fraud indicators requiring investigation</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.fraudCycles.map((cycle: any) => (
              <div key={cycle.id} className="p-3 bg-rose-50/40 border border-rose-100 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Cycle #{cycle.id.split('_')[1]}</span>
                  <span className="badge bg-rose-100 text-rose-700 text-[9px]">{cycle.length} nodes</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{cycle.nodes.join(' → ')} → {cycle.nodes[0]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communities */}
      {report.communities?.length > 0 && (
        <div className="chart-container">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Detected Graph Communities</h3>
          <p className="text-xs text-slate-400 mb-4">Node clusters identified by label propagation algorithm</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.communities.map((c: any, i: number) => (
              <div key={c.name} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-xs font-bold text-slate-900">{c.name}</span>
                  <span className="badge badge-slate text-[9px] ml-auto">{c.memberCount} members</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{c.members.join(', ')}{c.memberCount > 5 ? ` +${c.memberCount - 5} more` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partnership Predictions */}
      {report.topPartnerships?.length > 0 && (
        <div className="chart-container">
          <h3 className="text-base font-bold text-slate-900 mb-1 font-display">AI Partnership Recommendations</h3>
          <p className="text-xs text-slate-400 mb-4">Predicted high-value alliances using Jaccard similarity scoring</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.topPartnerships.map((p: any, i: number) => (
              <div key={i} className="p-4 bg-indigo-50/30 border border-indigo-100/60 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <Award size={14} className="text-indigo-500" />
                  <span className="badge badge-blue text-[10px]">{Math.round(p.score * 100)}% match</span>
                </div>
                <p className="text-xs font-bold text-slate-800">{p.sourceId} ↔ {p.targetId}</p>
                <p className="text-[10px] text-slate-400 mt-1">Common network: {(p.commonNeighbors || []).join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
