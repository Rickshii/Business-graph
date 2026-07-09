import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, Search, Filter, Download, X, Check,
  Building2, Users, Truck, Star, Swords, MessageSquare,
  ChevronDown, RefreshCw, Network, Link
} from 'lucide-react';
import { api } from '../services/api';
import { MOCK_NODES, MOCK_EDGES } from '../services/mockData';

const NODE_TYPES = ['ALL', 'BUSINESS', 'CUSTOMER', 'SUPPLIER', 'INFLUENCER', 'COMPETITOR', 'REVIEW'];
const EDGE_TYPES = ['BUYS_FROM', 'SUPPLIES', 'INFLUENCES', 'COMPETES', 'REVIEWS'];

const TYPE_COLORS: Record<string, string> = {
  BUSINESS: 'badge-blue', CUSTOMER: 'badge-green', SUPPLIER: 'badge-violet',
  INFLUENCER: 'badge-cyan', COMPETITOR: 'badge-red', REVIEW: 'badge-amber'
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  BUSINESS: <Building2 size={14} />, CUSTOMER: <Users size={14} />, SUPPLIER: <Truck size={14} />,
  INFLUENCER: <Star size={14} />, COMPETITOR: <Swords size={14} />, REVIEW: <MessageSquare size={14} />
};

// ─── Node Edit/Create Modal ───────────────────────────────────────────────────
function NodeModal({ node, onClose, onSave }: { node: any | null; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [label, setLabel] = useState(node?.label || '');
  const [type, setType] = useState(node?.type || 'BUSINESS');
  const [propsText, setPropsText] = useState(node ? JSON.stringify(node.properties || {}, null, 2) : '{}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!label.trim()) return setError('Label is required.');
    let props = {};
    try { props = JSON.parse(propsText); } catch { return setError('Properties must be valid JSON.'); }
    setSaving(true); setError('');
    try { await onSave({ label: label.trim(), type, properties: props }); onClose(); }
    catch (e: any) { setError(e.response?.data?.error || 'Save failed.'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 font-display">{node ? 'Edit Entity Node' : 'Create New Entity'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Label / Name *</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Apex Tech Solutions" className="input" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Entity Type *</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input">
              {NODE_TYPES.filter(t => t !== 'ALL').map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Properties (JSON)</label>
            <textarea
              rows={5}
              value={propsText}
              onChange={e => setPropsText(e.target.value)}
              className="input font-mono text-xs resize-none"
              placeholder='{"sector": "Technology", "employees": 500}'
            />
          </div>
          {error && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Saving...' : (node ? 'Update Node' : 'Create Node')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edge Modal ───────────────────────────────────────────────────────────────
function EdgeModal({ edge, nodes, onClose, onSave }: { edge: any | null; nodes: any[]; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [sourceId, setSourceId] = useState(edge?.sourceId || '');
  const [targetId, setTargetId] = useState(edge?.targetId || '');
  const [type, setType] = useState(edge?.type || 'BUYS_FROM');
  const [weight, setWeight] = useState(String(edge?.weight ?? 1.0));
  const [propsText, setPropsText] = useState(edge ? JSON.stringify(edge.properties || {}, null, 2) : '{}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!sourceId || !targetId || !type) return setError('Source, target, and type are required.');
    let props = {};
    try { props = JSON.parse(propsText); } catch { return setError('Properties must be valid JSON.'); }
    setSaving(true); setError('');
    try { await onSave({ sourceId, targetId, type, weight: parseFloat(weight) || 1.0, properties: props }); onClose(); }
    catch (e: any) { setError(e.response?.data?.error || 'Save failed.'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 font-display">{edge ? 'Edit Relationship' : 'Create Relationship'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {!edge && (
            <>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Source Entity *</label>
                <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="input">
                  <option value="">— Select source —</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.type})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Target Entity *</label>
                <select value={targetId} onChange={e => setTargetId(e.target.value)} className="input">
                  <option value="">— Select target —</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.type})</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Relationship Type *</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input">
              {EDGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Weight (0.0 – 1.0)</label>
            <input type="number" min="0" max="1" step="0.05" value={weight} onChange={e => setWeight(e.target.value)} className="input" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Properties (JSON)</label>
            <textarea rows={3} value={propsText} onChange={e => setPropsText(e.target.value)} className="input font-mono text-xs resize-none" placeholder='{"contract": "Annual"}' />
          </div>
          {error && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Saving...' : (edge ? 'Update' : 'Create Relationship')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Entities Page ───────────────────────────────────────────────────────
export default function Entities({ initialType = 'BUSINESS', setTab, onHighlightNodes }: {
  initialType?: string; setTab: (tab: string) => void; onHighlightNodes: (ids: string[]) => void;
}) {
  const [activeView, setActiveView] = useState<'nodes' | 'edges'>('nodes');
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [filterType, setFilterType] = useState(initialType || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [nodeModal, setNodeModal] = useState<{ open: boolean; node: any | null }>({ open: false, node: null });
  const [edgeModal, setEdgeModal] = useState<{ open: boolean; edge: any | null }>({ open: false, edge: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'node' | 'edge'; id: string; label: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nodesRes, edgesRes] = await Promise.all([api.get('/graph/nodes'), api.get('/graph/edges')]);
      setNodes(nodesRes.data);
      setEdges(edgesRes.data);
    } catch (e) {
      console.warn('Backend offline — loading mock entity data.');
      setNodes(MOCK_NODES);
      setEdges(MOCK_EDGES);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim() || filterType !== 'ALL') {
        setSearching(true);
        try {
          const res = await api.get('/graph/nodes/search', { params: { q: searchQuery, type: filterType } });
          setNodes(res.data);
        } catch { await fetchData(); }
        finally { setSearching(false); }
      } else {
        fetchData();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, filterType]);

  const handleSaveNode = async (data: any) => {
    if (nodeModal.node) {
      await api.put(`/graph/nodes/${nodeModal.node.id}`, data);
    } else {
      await api.post('/graph/nodes', data);
    }
    await fetchData();
  };

  const handleSaveEdge = async (data: any) => {
    if (edgeModal.edge) {
      const { sourceId, targetId, ...updateData } = data;
      await api.put(`/graph/edges/${edgeModal.edge.id}`, updateData);
    } else {
      await api.post('/graph/edges', data);
    }
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'node') await api.delete(`/graph/nodes/${deleteConfirm.id}`);
      else await api.delete(`/graph/edges/${deleteConfirm.id}`);
      await fetchData();
    } catch (e) { console.error('Delete failed:', e); }
    setDeleteConfirm(null);
  };

  const handleExportJSON = async () => {
    try {
      const res = await api.get('/graph/export', { params: { format: 'json' }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `brgi-graph-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch { console.error('Export failed'); }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/graph/export', { params: { format: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `brgi-graph-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { console.error('Export failed'); }
  };

  const getNodeLabel = (id: string) => nodes.find(n => n.id === id)?.label || id;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Entity Management</p>
          <h1 className="text-3xl font-bold text-slate-900 font-display">Directory Manager</h1>
          <p className="text-sm text-slate-400 mt-1">Create, edit, delete, search, and export graph entities and relationships.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportJSON} className="btn-secondary text-xs"><Download size={14} /> JSON</button>
          <button onClick={handleExportCSV} className="btn-secondary text-xs"><Download size={14} /> CSV</button>
          <button onClick={() => onHighlightNodes(nodes.map(n => n.id))} className="btn-secondary">
            <Network size={15} />View in Explorer
          </button>
          {activeView === 'nodes'
            ? <button onClick={() => setNodeModal({ open: true, node: null })} className="btn-primary"><Plus size={16} /> New Entity</button>
            : <button onClick={() => setEdgeModal({ open: true, edge: null })} className="btn-primary"><Plus size={16} /> New Relationship</button>
          }
        </div>
      </div>

      {/* View toggle + Search + Filter */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        {/* View Toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button onClick={() => setActiveView('nodes')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === 'nodes' ? 'bg-white text-indigo-600 shadow-soft-sm' : 'text-slate-400 hover:text-slate-700'}`}>
            <span className="flex items-center gap-1.5"><Network size={13} /> Entities ({nodes.length})</span>
          </button>
          <button onClick={() => setActiveView('edges')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === 'edges' ? 'bg-white text-indigo-600 shadow-soft-sm' : 'text-slate-400 hover:text-slate-700'}`}>
            <span className="flex items-center gap-1.5"><Link size={13} /> Relationships ({edges.length})</span>
          </button>
        </div>

        {activeView === 'nodes' && (
          <>
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" placeholder="Search by name, sector, location..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="input !pl-9 !py-2 text-xs"
              />
              {searching && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
            {/* Type Filter */}
            <div className="relative">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input !pl-9 !py-2 text-xs min-w-[150px]">
                {NODE_TYPES.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Data Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={20} className="text-indigo-400 animate-spin" />
            <span className="ml-2 text-sm text-slate-400">Loading entities...</span>
          </div>
        ) : activeView === 'nodes' ? (
          <table className="data-table" style={{ minWidth: '560px' }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Label / Name</th>
                <th>Key Properties</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nodes.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">No entities found. Create your first entity.</td></tr>
              ) : nodes.map(node => (
                <tr key={node.id}>
                  <td>
                    <span className={`badge ${TYPE_COLORS[node.type] || 'badge-slate'} gap-1.5`}>
                      {TYPE_ICONS[node.type]}{node.type}
                    </span>
                  </td>
                  <td className="font-semibold text-slate-800">{node.label}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(node.properties || {}).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="text-[10px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 text-slate-500 font-medium">
                          {k}: <span className="text-slate-700">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { onHighlightNodes([node.id]); setTab('explorer'); }}
                        className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 cursor-pointer"
                        title="View in Graph"
                      ><Network size={14} /></button>
                      <button
                        onClick={() => setNodeModal({ open: true, node })}
                        className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer"
                        title="Edit"
                      ><Edit3 size={14} /></button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'node', id: node.id, label: node.label })}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Delete"
                      ><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="data-table" style={{ minWidth: '700px' }}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Relationship</th>
                <th>Target</th>
                <th>Weight</th>
                <th>Properties</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {edges.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No relationships found. Create your first relationship.</td></tr>
              ) : edges.map(edge => (
                <tr key={edge.id}>
                  <td className="font-semibold text-slate-700 text-xs">{getNodeLabel(edge.sourceId)}</td>
                  <td>
                    <span className="badge badge-slate text-[10px]">{edge.type}</span>
                  </td>
                  <td className="font-semibold text-slate-700 text-xs">{getNodeLabel(edge.targetId)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 progress-bar">
                        <div className="progress-fill bg-indigo-500" style={{ width: `${edge.weight * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{edge.weight.toFixed(2)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(edge.properties || {}).slice(0, 2).map(([k, v]) => (
                        <span key={k} className="text-[10px] bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5 text-slate-500">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setEdgeModal({ open: true, edge })} className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer" title="Edit"><Edit3 size={14} /></button>
                      <button onClick={() => setDeleteConfirm({ type: 'edge', id: edge.id, label: `${getNodeLabel(edge.sourceId)} → ${getNodeLabel(edge.targetId)}` })} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {nodeModal.open && <NodeModal node={nodeModal.node} onClose={() => setNodeModal({ open: false, node: null })} onSave={handleSaveNode} />}
      {edgeModal.open && <EdgeModal edge={edgeModal.edge} nodes={nodes} onClose={() => setEdgeModal({ open: false, edge: null })} onSave={handleSaveEdge} />}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Deletion</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
              Delete <span className="font-bold">{deleteConfirm.label}</span>?
              {deleteConfirm.type === 'node' && ' All connected relationships will also be removed.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleDelete} className="btn-danger flex-1 justify-center">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
