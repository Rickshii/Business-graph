import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState,
  MarkerType, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Trash2, RefreshCw, Layers, HelpCircle, Building, Users, Truck, MessageSquare, Flame, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { MOCK_NODES, MOCK_EDGES } from '../services/mockData';

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  BUSINESS:   { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA', badge: '#6366F1' },
  CUSTOMER:   { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', badge: '#10B981' },
  SUPPLIER:   { bg: '#FAF5FF', border: '#E9D5FF', text: '#581C87', badge: '#8B5CF6' },
  INFLUENCER: { bg: '#ECFEFF', border: '#A5F3FC', text: '#164E63', badge: '#06B6D4' },
  COMPETITOR: { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', badge: '#F43F5E' },
  REVIEW:     { bg: '#FFFBEB', border: '#FDE68A', text: '#78350F', badge: '#F59E0B' },
};

const CustomNode = ({ data }: any) => {
  const colors = NODE_COLORS[data.type] || { bg: '#F8FAFC', border: '#E2E8F0', text: '#475569', badge: '#94A3B8' };
  const getIcon = () => {
    switch (data.type) {
      case 'BUSINESS':   return <Building size={14} />;
      case 'CUSTOMER':   return <Users size={14} />;
      case 'SUPPLIER':   return <Truck size={14} />;
      case 'INFLUENCER': return <TrendingUp size={14} />;
      case 'COMPETITOR': return <Flame size={14} />;
      case 'REVIEW':     return <MessageSquare size={14} />;
      default:           return <HelpCircle size={14} />;
    }
  };
  return (
    <div
      className="min-w-[160px] transition-all duration-200"
      style={{
        background: data.isHighlighted ? '#FFFBEB' : colors.bg,
        border: `2px solid ${data.isHighlighted ? '#FDE68A' : colors.border}`,
        borderRadius: 16,
        boxShadow: data.isHighlighted
          ? '0 0 0 4px rgba(251,191,36,0.2), 0 8px 24px rgba(0,0,0,0.06)'
          : '0 4px 16px rgba(0,0,0,0.04)',
        padding: '10px 14px',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.badge, border: 'none', width: 8, height: 8 }} />
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${colors.badge}20`, color: colors.badge }}>
          {getIcon()}
        </div>
        <div className="truncate">
          <p className="text-[12px] font-bold truncate leading-tight" style={{ color: '#1E293B' }}>{data.label}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: colors.badge }}>{data.type}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.badge, border: 'none', width: 8, height: 8 }} />
    </div>
  );
};

export default function GraphExplorer({ highlightedNodeIds, onClearHighlights }: { highlightedNodeIds: string[]; onClearHighlights: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [layoutType, setLayoutType] = useState<string>('Circular');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState('BUSINESS');
  const [newEdgeSource, setNewEdgeSource] = useState('');
  const [newEdgeTarget, setNewEdgeTarget] = useState('');
  const [newEdgeType, setNewEdgeType] = useState('BUYS_FROM');
  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  const applyLayout = useCallback((nodesList: any[], edgesList: any[], type = 'Circular') => {
    const cx = 500, cy = 350;
    if (type === 'Circular') {
      const radius = 300;
      return nodesList.map((n, i) => {
        const angle = (i / nodesList.length) * 2 * Math.PI;
        return { ...n, id: n.id, type: 'customNode', data: { ...n, isHighlighted: highlightedNodeIds.includes(n.id) }, position: { x: cx + radius * Math.cos(angle) - 85, y: cy + radius * Math.sin(angle) - 25 } };
      });
    } else if (type === 'Grid') {
      const cols = Math.ceil(Math.sqrt(nodesList.length)), spacingX = 220, spacingY = 120;
      return nodesList.map((n, i) => ({ ...n, id: n.id, type: 'customNode', data: { ...n, isHighlighted: highlightedNodeIds.includes(n.id) }, position: { x: (i % cols) * spacingX + 100, y: Math.floor(i / cols) * spacingY + 100 } }));
    } else {
      return nodesList.map((n) => ({ ...n, id: n.id, type: 'customNode', data: { ...n, isHighlighted: highlightedNodeIds.includes(n.id) }, position: { x: cx + (Math.random() - 0.5) * 400 - 85, y: cy + (Math.random() - 0.5) * 400 - 25 } }));
    }
  }, [highlightedNodeIds]);

  const loadGraphData = useCallback(async () => {
    try {
      const [nRes, eRes] = await Promise.all([api.get('/graph/nodes'), api.get('/graph/edges')]);
      setRawNodes(nRes.data); setRawEdges(eRes.data);
    } catch (err) {
      console.warn('Backend offline — loading mock graph dataset.');
      setRawNodes(MOCK_NODES); setRawEdges(MOCK_EDGES);
    }
  }, []);

  useEffect(() => { loadGraphData(); }, [loadGraphData, highlightedNodeIds]);

  useEffect(() => {
    let filteredNodes = filterType !== 'ALL' ? rawNodes.filter(n => n.type === filterType) : rawNodes;
    const flowNodes = applyLayout(filteredNodes, rawEdges, layoutType);
    const activeNodeIds = new Set(filteredNodes.map(n => n.id));
    const flowEdges = rawEdges.filter(e => activeNodeIds.has(e.sourceId) && activeNodeIds.has(e.targetId)).map(e => {
      const hasHighlight = highlightedNodeIds.includes(e.sourceId) && highlightedNodeIds.includes(e.targetId);
      return {
        id: e.id, source: e.sourceId, target: e.targetId, label: e.type, type: 'smoothstep',
        animated: hasHighlight || e.type === 'SUPPLIES' || e.type === 'BUYS_FROM',
        style: { stroke: hasHighlight ? '#F59E0B' : '#E2E8F0', strokeWidth: hasHighlight ? 3 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: hasHighlight ? '#F59E0B' : '#E2E8F0' }
      };
    });
    setNodes(flowNodes); setEdges(flowEdges);
  }, [rawNodes, rawEdges, filterType, layoutType, applyLayout, highlightedNodeIds, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: any) => { setSelectedNode(node.data); }, []);

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;
    try {
      const res = await api.post('/graph/nodes', { label: newNodeName, type: newNodeType, properties: { sector: 'Tech SaaS', createdAt: new Date().toISOString() } });
      setRawNodes(prev => [...prev, res.data]);
      api.post('/admin/logs', { action: 'NODE_ADD', details: `Added node: ${newNodeName} (${newNodeType})` });
    } catch (err) {
      console.warn('Backend offline — adding node locally.');
      const localNode = { id: `local_n_${Date.now()}`, label: newNodeName, type: newNodeType, properties: { sector: 'Tech SaaS', createdAt: new Date().toISOString() } };
      setRawNodes(prev => [...prev, localNode]);
    }
    setNewNodeName('');
  };

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEdgeSource || !newEdgeTarget) return;
    try {
      const res = await api.post('/graph/edges', { sourceId: newEdgeSource, targetId: newEdgeTarget, type: newEdgeType, weight: 1.0, properties: {} });
      setRawEdges(prev => [...prev, res.data]);
      api.post('/admin/logs', { action: 'EDGE_ADD', details: `Connected: ${newEdgeSource} to ${newEdgeTarget} via ${newEdgeType}` });
    } catch (err) {
      console.warn('Backend offline — adding relationship locally.');
      const localEdge = { id: `local_e_${Date.now()}`, sourceId: newEdgeSource, targetId: newEdgeTarget, type: newEdgeType, weight: 1.0, properties: {} };
      setRawEdges(prev => [...prev, localEdge]);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!window.confirm('Delete this entity and all associated links?')) return;
    try {
      await api.delete(`/graph/nodes/${nodeId}`);
      api.post('/admin/logs', { action: 'NODE_DELETE', details: `Removed node: ${nodeId}` });
    } catch (err) {
      console.warn('Backend offline — removing node locally.');
    }
    setRawNodes(prev => prev.filter(n => n.id !== nodeId));
    setRawEdges(prev => prev.filter(e => e.sourceId !== nodeId && e.targetId !== nodeId));
    setSelectedNode(null);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex gap-5 animate-slide-up relative">
      {/* React Flow Canvas */}
      <div className="flex-grow bg-white border border-slate-100 rounded-3xl overflow-hidden relative shadow-soft-md">
        {highlightedNodeIds.length > 0 && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-xl shadow-soft-sm animate-fade-in">
            <span className="text-xs font-bold">Highlighting AI recommendation network</span>
            <button onClick={onClearHighlights} className="text-xs text-amber-700 underline font-bold hover:text-amber-900 cursor-pointer">Clear</button>
          </div>
        )}
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView>
          <Background color="#E2E8F0" gap={20} size={1} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>

        {/* Floating Controls */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-slate-100 p-4 rounded-2xl shadow-soft-md flex gap-4 text-xs font-semibold text-slate-600">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Filter Type</span>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-300">
              <option value="ALL">All Nodes</option>
              <option value="BUSINESS">Businesses</option>
              <option value="CUSTOMER">Customers</option>
              <option value="SUPPLIER">Suppliers</option>
              <option value="INFLUENCER">Influencers</option>
              <option value="COMPETITOR">Competitors</option>
              <option value="REVIEW">Reviews</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Layout</span>
            <select value={layoutType} onChange={(e) => setLayoutType(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-300">
              <option value="Circular">Circular</option>
              <option value="Grid">Grid</option>
              <option value="Force">Force</option>
            </select>
          </div>
          <button onClick={loadGraphData} className="btn-secondary self-end !py-1.5 !px-3 !text-xs">
            <RefreshCw size={12} /> Sync
          </button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-76 flex flex-col gap-4 h-full overflow-y-auto scrollbar-thin" style={{ width: 300 }}>
        {/* Entity Inspector */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 font-display flex items-center gap-2 mb-4">
            <Layers size={14} className="text-indigo-500" /> Entity Inspector
          </h3>
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Label</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedNode.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class</p>
                  <span className={`badge mt-1 ${selectedNode.type === 'BUSINESS' ? 'badge-blue' : selectedNode.type === 'CUSTOMER' ? 'badge-green' : selectedNode.type === 'SUPPLIER' ? 'badge-violet' : selectedNode.type === 'INFLUENCER' ? 'badge-cyan' : selectedNode.type === 'COMPETITOR' ? 'badge-red' : 'badge-amber'}`}>{selectedNode.type}</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Node ID</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1 truncate">{selectedNode.id}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Properties</p>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-mono text-slate-600 space-y-1 overflow-x-auto max-h-36 scrollbar-thin">
                  {Object.entries(selectedNode.properties || {}).map(([k, v]: any) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-slate-400">{k}:</span>
                      <span className="font-bold text-slate-700 truncate">{JSON.stringify(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => handleDeleteNode(selectedNode.id)} className="btn-danger w-full justify-center !py-2.5">
                <Trash2 size={14} /> Delete Node
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center leading-relaxed">Click any node in the canvas to inspect its properties.</p>
          )}
        </div>

        {/* Add Entity */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 font-display flex items-center gap-2 mb-4">
            <Plus size={14} className="text-emerald-500" /> Add Entity
          </h3>
          <form onSubmit={handleAddNode} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Entity Name</label>
              <input type="text" value={newNodeName} onChange={(e) => setNewNodeName(e.target.value)} placeholder="e.g. Apex Suppliers Ltd" className="input" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Node Class</label>
              <select value={newNodeType} onChange={(e) => setNewNodeType(e.target.value)} className="input">
                <option value="BUSINESS">Business</option>
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="INFLUENCER">Influencer</option>
                <option value="COMPETITOR">Competitor</option>
                <option value="REVIEW">Review</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full justify-center !py-2.5">Add Node</button>
          </form>
        </div>

        {/* Add Relationship */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 font-display flex items-center gap-2 mb-4">
            <Plus size={14} className="text-violet-500" /> Add Relationship
          </h3>
          <form onSubmit={handleAddEdge} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Source Node</label>
              <select value={newEdgeSource} onChange={(e) => setNewEdgeSource(e.target.value)} className="input">
                <option value="">Select source...</option>
                {rawNodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.type})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Node</label>
              <select value={newEdgeTarget} onChange={(e) => setNewEdgeTarget(e.target.value)} className="input">
                <option value="">Select target...</option>
                {rawNodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.type})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Link Type</label>
              <select value={newEdgeType} onChange={(e) => setNewEdgeType(e.target.value)} className="input">
                <option value="BUYS_FROM">BUYS_FROM</option>
                <option value="SUPPLIES">SUPPLIES</option>
                <option value="INFLUENCES">INFLUENCES</option>
                <option value="COMPETES">COMPETES</option>
                <option value="REVIEWS">REVIEWS</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full justify-center !py-2.5">Establish Link</button>
          </form>
        </div>
      </div>
    </div>
  );
}
