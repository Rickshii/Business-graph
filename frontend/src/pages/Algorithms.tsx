import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Award, ShieldCheck, Route, Network, Users, TrendingUp, AlertTriangle, Link, ArrowRight, ArrowUpRight, PlayCircle } from 'lucide-react';
import { api } from '../services/api';
import {
  MOCK_NODES,
  MOCK_PAGERANK,
  MOCK_COMMUNITIES,
  MOCK_FRAUD,
  MOCK_PARTNERSHIPS,
  MOCK_DOMINANCE_ALGO,
  MOCK_PATHFIND
} from '../services/mockData';

type AlgoType = 'PAGERANK' | 'COMMUNITY' | 'FRAUD' | 'PARTNERSHIP' | 'SUPPLY' | 'DOMINANCE';

const ALGO_TABS = [
  { type: 'PAGERANK',    label: 'PageRank',    icon: <Award size={15} />,       color: 'indigo' },
  { type: 'COMMUNITY',  label: 'Communities', icon: <Users size={15} />,       color: 'emerald' },
  { type: 'FRAUD',      label: 'Fraud Audit', icon: <ShieldCheck size={15} />, color: 'rose' },
  { type: 'PARTNERSHIP',label: 'Alliances',   icon: <Link size={15} />,        color: 'violet' },
  { type: 'SUPPLY',     label: 'Supply Chain',icon: <Route size={15} />,       color: 'cyan' },
  { type: 'DOMINANCE',  label: 'Market Share',icon: <TrendingUp size={15} />,  color: 'amber' },
];

const COLORS = ['#6366F1', '#10B981', '#8B5CF6', '#06B6D4', '#F43F5E', '#F59E0B'];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  indigo:  { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-100' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-100' },
  rose:    { bg: 'bg-rose-500',    text: 'text-rose-600',    border: 'border-rose-100' },
  violet:  { bg: 'bg-violet-500',  text: 'text-violet-600',  border: 'border-violet-100' },
  cyan:    { bg: 'bg-cyan-500',    text: 'text-cyan-600',    border: 'border-cyan-100' },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-600',   border: 'border-amber-100' },
};

export default function Algorithms({ initialAlgo = 'PAGERANK', setTab, onHighlightNodes }: { initialAlgo?: string; setTab: (tab: string) => void; onHighlightNodes: (nodeIds: string[]) => void }) {
  const [activeAlgo, setActiveAlgo] = useState<AlgoType>(initialAlgo as AlgoType);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<any[]>([]);
  const [pageRank, setPageRank] = useState<any[]>([]);
  const [communities, setCommunities] = useState<Record<string, string>>({});
  const [fraudData, setFraudData] = useState<{ cycles: string[][]; riskScores: Record<string, number> }>({ cycles: [], riskScores: {} });
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [dominance, setDominance] = useState<any[]>([]);
  const [supplySource, setSupplySource] = useState('');
  const [supplyTarget, setSupplyTarget] = useState('');
  const [supplyPaths, setSupplyPaths] = useState<string[][]>([]);

  const fetchGraphDetails = async () => {
    try {
      const res = await api.get('/graph/nodes');
      setNodes(res.data);
    } catch (err) {
      setNodes(MOCK_NODES);
    }
  };

  const runAlgorithm = async () => {
    setLoading(true);
    try {
      await fetchGraphDetails();
      if (activeAlgo === 'PAGERANK') {
        const res = await api.get('/graph/algorithms/pagerank');
        setPageRank(Object.entries(res.data).map(([id, val]: any) => ({ id, score: val })).sort((a, b) => b.score - a.score));
      } else if (activeAlgo === 'COMMUNITY') {
        const res = await api.get('/graph/algorithms/community'); setCommunities(res.data);
      } else if (activeAlgo === 'FRAUD') {
        const res = await api.get('/graph/algorithms/fraud'); setFraudData(res.data);
      } else if (activeAlgo === 'PARTNERSHIP') {
        const res = await api.get('/graph/algorithms/partnership-prediction'); setPartnerships(res.data);
      } else if (activeAlgo === 'DOMINANCE') {
        const res = await api.get('/graph/algorithms/market-dominance'); setDominance(res.data);
      }
    } catch (err) {
      console.warn(`Backend offline — running mock ${activeAlgo} calculation.`);
      if (activeAlgo === 'PAGERANK') {
        setPageRank(MOCK_PAGERANK.map((item, idx) => ({ id: `n${idx + 1}`, score: item.score / 100 })));
      } else if (activeAlgo === 'COMMUNITY') {
        setCommunities(MOCK_COMMUNITIES);
      } else if (activeAlgo === 'FRAUD') {
        setFraudData(MOCK_FRAUD);
      } else if (activeAlgo === 'PARTNERSHIP') {
        setPartnerships(MOCK_PARTNERSHIPS);
      } else if (activeAlgo === 'DOMINANCE') {
        setDominance(MOCK_DOMINANCE_ALGO);
      }
    }
    finally { setLoading(false); }
  };

  useEffect(() => { runAlgorithm(); }, [activeAlgo]);

  const handleSupplyPathfind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplySource || !supplyTarget) return;
    setLoading(true);
    try {
      const res = await api.get(`/graph/algorithms/supply-chain?sourceId=${supplySource}&targetId=${supplyTarget}`);
      setSupplyPaths(res.data);
    } catch (err) {
      console.warn('Backend offline — pathfinding locally using mock data.');
      // Simple pathfind check or return default mock paths
      setSupplyPaths(MOCK_PATHFIND);
    }
    finally { setLoading(false); }
  };

  const getNodeName = (id: string) => nodes.find(n => n.id === id)?.label || id;
  const getNodeType = (id: string) => nodes.find(n => n.id === id)?.type || 'UNKNOWN';

  const communityGroups = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    Object.entries(communities).forEach(([nodeId, groupName]) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) { groups[groupName] = groups[groupName] || []; groups[groupName].push(node); }
    });
    return groups;
  }, [communities, nodes]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">AI Analysis Engine</p>
          <h1 className="text-3xl font-bold text-slate-900 font-display">Graph Algorithms Panel</h1>
          <p className="text-sm text-slate-400 mt-1">Execute Graph AI models to isolate risk, calculate influence, and identify business correlations.</p>
        </div>
        <button onClick={runAlgorithm} className="btn-primary">
          <PlayCircle size={16} /> Execute Model
        </button>
      </div>

      {/* Algorithm Tabs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {ALGO_TABS.map((tab) => {
          const active = activeAlgo === tab.type;
          const c = COLOR_MAP[tab.color];
          return (
            <button
              key={tab.type}
              onClick={() => setActiveAlgo(tab.type as AlgoType)}
              className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border font-semibold text-xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                active ? `${c.bg} border-transparent text-white shadow-soft-md` : `bg-white border-slate-100 ${c.text} hover:border-slate-200 hover:shadow-soft-sm`
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
          <p className="text-sm font-semibold text-slate-500">Processing Graph AI model operations...</p>
        </div>
      ) : (
        <div className="animate-fade-in">

          {/* PAGERANK */}
          {activeAlgo === 'PAGERANK' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card p-6 md:col-span-2">
                <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Influence Leaderboard</h3>
                <p className="text-xs text-slate-400 mb-5">Relative centrality scores mapped via the PageRank Algorithm.</p>
                <table className="data-table">
                  <thead><tr><th>Rank</th><th>Entity Name</th><th>Class</th><th>PageRank Score</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>
                    {pageRank.map((item, idx) => (
                      <tr key={item.id}>
                        <td><span className="text-sm font-bold text-slate-400">#{idx + 1}</span></td>
                        <td><div className="font-bold text-slate-800">{getNodeName(item.id)}</div><div className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.id}</div></td>
                        <td><span className={`badge ${getNodeType(item.id) === 'BUSINESS' ? 'badge-blue' : getNodeType(item.id) === 'CUSTOMER' ? 'badge-green' : 'badge-violet'}`}>{getNodeType(item.id)}</span></td>
                        <td><span className="font-bold text-indigo-600">{(item.score * 100).toFixed(3)}%</span></td>
                        <td className="text-right"><button onClick={() => { setTab('explorer'); onHighlightNodes([item.id]); }} className="btn-secondary !py-1.5 !px-2.5 text-xs">Explore</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Algorithm Insights</h3>
                  <p className="text-xs text-slate-400 mb-4">Structural Analysis Details</p>
                  <p className="text-xs text-slate-500 leading-relaxed">PageRank computes node relevance by surveying the connection density of neighbor lines. Entities with high scores command key positioning in transactional networks.</p>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mt-6">
                  <h4 className="text-xs font-bold text-indigo-800">Model Hyperparameters</h4>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-500 font-semibold">
                    <div>Damping: <span className="text-slate-800">0.85</span></div>
                    <div>Iterations: <span className="text-slate-800">20</span></div>
                    <div>Tolerance: <span className="text-slate-800">1e-6</span></div>
                    <div>Norm: <span className="text-slate-800">L1 Sum</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMMUNITY */}
          {activeAlgo === 'COMMUNITY' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Object.entries(communityGroups).map(([groupName, groupNodes], gi) => (
                <div key={groupName} className="card p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[gi % COLORS.length] }}></div>
                      {groupName}
                    </h3>
                    <span className="badge badge-slate">{groupNodes.length} nodes</span>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                    {groupNodes.map((node) => (
                      <div key={node.id} onClick={() => { setTab('explorer'); onHighlightNodes([node.id]); }}
                        className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-all">
                        <div>
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{node.label}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{node.type}</p>
                        </div>
                        <ArrowUpRight size={14} className="text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(communityGroups).length === 0 && (
                <div className="card p-12 text-center md:col-span-3"><p className="text-sm text-slate-400">No community data found. Add more relationships.</p></div>
              )}
            </div>
          )}

          {/* FRAUD */}
          {activeAlgo === 'FRAUD' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card p-6 md:col-span-2 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Suspect Circular Cycles</h3>
                  <p className="text-xs text-slate-400">Cycles indicate potential shell-company capital transfers or review collusion rings.</p>
                </div>
                <div className="space-y-3">
                  {fraudData.cycles.map((cycle, index) => (
                    <div key={index} onClick={() => { setTab('explorer'); onHighlightNodes(cycle); }}
                      className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 flex justify-between items-center cursor-pointer hover:bg-rose-50/60 transition-all hover:-translate-y-0.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        {cycle.map((id, cIdx) => (
                          <React.Fragment key={id}>
                            <span className="text-slate-800">{getNodeName(id)}</span>
                            {cIdx < cycle.length - 1 && <ArrowRight size={12} className="text-rose-300" />}
                          </React.Fragment>
                        ))}
                        <ArrowRight size={12} className="text-rose-300" />
                        <span className="text-slate-800">{getNodeName(cycle[0])}</span>
                      </div>
                      <span className="badge badge-red shrink-0">Cycle Risk</span>
                    </div>
                  ))}
                  {fraudData.cycles.length === 0 && <div className="text-center py-10 text-slate-400 text-xs"><p className="text-sm font-semibold mb-1">✓ Network is clean</p>No circular dependency loops found.</div>}
                </div>
              </div>
              <div className="card p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 font-display">Collusion Risk Scores</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {Object.entries(fraudData.riskScores).map(([id, score]) => (
                    <div key={id} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div><p className="text-xs font-bold text-slate-800">{getNodeName(id)}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{getNodeType(id)}</p></div>
                        <span className={`badge ${score > 0.6 ? 'badge-red' : score > 0.3 ? 'badge-amber' : 'badge-green'}`}>{Math.round(score * 100)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${score * 100}%`, backgroundColor: score > 0.6 ? '#F43F5E' : score > 0.3 ? '#F59E0B' : '#10B981' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PARTNERSHIP */}
          {activeAlgo === 'PARTNERSHIP' && (
            <div className="card p-6 max-w-4xl mx-auto">
              <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Alliance Recommendations</h3>
              <p className="text-xs text-slate-400 mb-5">Alliance opportunities calculated via mutual neighbors Jaccard Coefficients.</p>
              <table className="data-table">
                <thead><tr><th>Recommended Partners</th><th>Match Strength</th><th>Mutual Connections</th><th className="text-right">Action</th></tr></thead>
                <tbody>
                  {partnerships.map((p, idx) => (
                    <tr key={idx}>
                      <td><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><span>{getNodeName(p.sourceId)}</span><span className="text-slate-300">&</span><span>{getNodeName(p.targetId)}</span></div></td>
                      <td><div className="flex items-center gap-2"><span className="font-bold text-indigo-600 text-sm">{Math.round(p.score * 100)}%</span><div className="progress-bar w-20"><div className="progress-fill bg-indigo-500" style={{ width: `${p.score * 100}%` }}></div></div></div></td>
                      <td className="text-slate-500 text-xs font-medium">{p.commonNeighbors.join(', ')}</td>
                      <td className="text-right"><button onClick={() => { setTab('explorer'); onHighlightNodes([p.sourceId, p.targetId]); }} className="btn-secondary !py-1 !px-2.5 text-xs">Map Links</button></td>
                    </tr>
                  ))}
                  {partnerships.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-slate-400">Add shared suppliers or customers to generate alliance scores.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* SUPPLY CHAIN */}
          {activeAlgo === 'SUPPLY' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card p-6">
                <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Pathfinder</h3>
                <p className="text-xs text-slate-400 mb-5">Discover supply transit paths between actors.</p>
                <form onSubmit={handleSupplyPathfind} className="space-y-4">
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Source Supplier</label><select value={supplySource} onChange={(e) => setSupplySource(e.target.value)} className="input"><option value="">Select source...</option>{nodes.filter(n => n.type === 'SUPPLIER' || n.type === 'BUSINESS').map(n => <option key={n.id} value={n.id}>{n.label} ({n.type})</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Customer / Business</label><select value={supplyTarget} onChange={(e) => setSupplyTarget(e.target.value)} className="input"><option value="">Select target...</option>{nodes.filter(n => n.type === 'CUSTOMER' || n.type === 'BUSINESS').map(n => <option key={n.id} value={n.id}>{n.label} ({n.type})</option>)}</select></div>
                  <button type="submit" className="btn-primary w-full justify-center">Run Pathfind</button>
                </form>
              </div>
              <div className="card p-6 md:col-span-2 space-y-4">
                <h3 className="text-base font-bold text-slate-900 font-display">Active Paths Identified</h3>
                <div className="space-y-3">
                  {supplyPaths.map((path, idx) => (
                    <div key={idx} onClick={() => { setTab('explorer'); onHighlightNodes(path); }}
                      className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 cursor-pointer flex justify-between items-center transition-all hover:-translate-y-0.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
                        {path.map((nodeId, pIdx) => (
                          <React.Fragment key={nodeId}>
                            <span>{getNodeName(nodeId)}</span>
                            {pIdx < path.length - 1 && <ArrowRight size={12} className="text-slate-300" />}
                          </React.Fragment>
                        ))}
                      </div>
                      <span className="badge badge-violet shrink-0">{path.length - 1} hops</span>
                    </div>
                  ))}
                  {supplyPaths.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Enter source and target nodes to calculate supply paths.</div>}
                </div>
              </div>
            </div>
          )}

          {/* DOMINANCE */}
          {activeAlgo === 'DOMINANCE' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card p-6 md:col-span-2">
                <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Market Dominance Shares</h3>
                <p className="text-xs text-slate-400 mb-5">Competitor network strength calculated by direct BUYS_FROM customer relations.</p>
                <table className="data-table">
                  <thead><tr><th>Brand Name</th><th>Customer Connections</th><th>Relative Market Share</th></tr></thead>
                  <tbody>
                    {dominance.map((d, i) => (
                      <tr key={i}>
                        <td><span className="font-bold text-slate-800">{d.name}</span></td>
                        <td><span className="font-medium text-slate-500">{d.nodeCount} active links</span></td>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900 text-sm">{d.marketShare}%</span>
                            <div className="progress-bar flex-1 max-w-[100px]">
                              <div className="progress-fill" style={{ width: `${d.marketShare}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dominance.length === 0 && <tr><td colSpan={3} className="text-center py-12 text-slate-400">No dominance data available. Add competitor links.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="card p-6">
                <h3 className="text-base font-bold text-slate-900 mb-1 font-display">Modality Analysis</h3>
                <p className="text-xs text-slate-400 mb-4">Dominance Insights</p>
                <p className="text-xs text-slate-500 leading-relaxed">By looking at the distribution of customer connections in the Graph database, we map real-time brand dominance. Large market share differences create strong network gravity.</p>
                {dominance.length > 0 && (
                  <div className="mt-5 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dominance} margin={{ left: -20, right: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                        <XAxis dataKey="name" stroke="#CBD5E1" fontSize={9} tickLine={false} />
                        <YAxis stroke="#CBD5E1" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9' }} />
                        <Bar dataKey="marketShare" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
