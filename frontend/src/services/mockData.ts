// ─── BRGI Mock Data (used when backend is offline) ───────────────────────────

export const MOCK_NODES = [
  { id: 'n1', label: 'Apex Tech Solutions', type: 'BUSINESS',    properties: { sector: 'Technology', employees: 520, revenue: '$4.2M' } },
  { id: 'n2', label: 'Nova Retail Group',   type: 'BUSINESS',    properties: { sector: 'Retail',     employees: 210, revenue: '$1.8M' } },
  { id: 'n3', label: 'CloudBase Systems',   type: 'SUPPLIER',    properties: { product: 'Cloud Infra', contract: 'Annual' } },
  { id: 'n4', label: 'Priya Sharma',        type: 'INFLUENCER',  properties: { followers: 280000, platform: 'LinkedIn' } },
  { id: 'n5', label: 'DataEdge Corp',       type: 'COMPETITOR',  properties: { sector: 'Technology', employees: 730 } },
  { id: 'n6', label: 'Jordan Ali',          type: 'CUSTOMER',    properties: { tier: 'Enterprise', since: '2023' } },
  { id: 'n7', label: 'SwiftLogistics Ltd',  type: 'SUPPLIER',    properties: { product: 'Shipping & Fulfillment', contract: 'Monthly' } },
  { id: 'n8', label: 'Maya Chen',           type: 'CUSTOMER',    properties: { tier: 'Pro', since: '2024' } },
  { id: 'n9', label: 'OmniCorp Industries', type: 'COMPETITOR',  properties: { sector: 'Retail', employees: 1200 } },
  { id: 'n10', label: 'G2 Review — Apex',  type: 'REVIEW',      properties: { rating: 4.7, platform: 'G2', votes: 183 } },
  { id: 'n11', label: 'Trustpilot — Nova', type: 'REVIEW',      properties: { rating: 4.2, platform: 'Trustpilot', votes: 97 } },
  { id: 'n12', label: 'Prime Parts Co.',   type: 'SUPPLIER',    properties: { product: 'Hardware Components', contract: 'Quarterly' } },
];

export const MOCK_EDGES = [
  { id: 'e1',  sourceId: 'n6',  targetId: 'n1',  type: 'BUYS_FROM',  weight: 0.9,  properties: { value: '$120K', frequency: 'Monthly' } },
  { id: 'e2',  sourceId: 'n8',  targetId: 'n2',  type: 'BUYS_FROM',  weight: 0.7,  properties: { value: '$45K',  frequency: 'Quarterly' } },
  { id: 'e3',  sourceId: 'n3',  targetId: 'n1',  type: 'SUPPLIES',   weight: 0.85, properties: { sla: '99.9%' } },
  { id: 'e4',  sourceId: 'n7',  targetId: 'n2',  type: 'SUPPLIES',   weight: 0.6,  properties: { sla: '97%' } },
  { id: 'e5',  sourceId: 'n12', targetId: 'n1',  type: 'SUPPLIES',   weight: 0.75, properties: { sla: '98.5%' } },
  { id: 'e6',  sourceId: 'n4',  targetId: 'n1',  type: 'INFLUENCES', weight: 0.95, properties: { reach: '280K', campaign: 'Q2 2026' } },
  { id: 'e7',  sourceId: 'n4',  targetId: 'n2',  type: 'INFLUENCES', weight: 0.65, properties: { reach: '280K', campaign: 'Q3 2026' } },
  { id: 'e8',  sourceId: 'n5',  targetId: 'n1',  type: 'COMPETES',   weight: 0.8,  properties: { overlap: 'Cloud SaaS' } },
  { id: 'e9',  sourceId: 'n9',  targetId: 'n2',  type: 'COMPETES',   weight: 0.7,  properties: { overlap: 'SMB Retail' } },
  { id: 'e10', sourceId: 'n10', targetId: 'n1',  type: 'REVIEWS',    weight: 0.95, properties: { sentiment: 'Positive' } },
  { id: 'e11', sourceId: 'n11', targetId: 'n2',  type: 'REVIEWS',    weight: 0.85, properties: { sentiment: 'Positive' } },
];

export const MOCK_STATS = {
  totalNodes: MOCK_NODES.length,
  totalEdges: MOCK_EDGES.length,
  graphConnected: false,
  graphEngine: 'Local Mock Engine',
  uptime: 99.8,
  usersCount: 3,
  typeCounts: { BUSINESS: 2, CUSTOMER: 2, SUPPLIER: 3, INFLUENCER: 1, COMPETITOR: 2, REVIEW: 2 },
};

export const MOCK_TREND = [
  { month: 'Jan', 'Node Volume': 4,  'Edge Relations': 3,  'AI Queries': 8  },
  { month: 'Feb', 'Node Volume': 6,  'Edge Relations': 5,  'AI Queries': 12 },
  { month: 'Mar', 'Node Volume': 7,  'Edge Relations': 7,  'AI Queries': 15 },
  { month: 'Apr', 'Node Volume': 9,  'Edge Relations': 8,  'AI Queries': 22 },
  { month: 'May', 'Node Volume': 11, 'Edge Relations': 10, 'AI Queries': 28 },
  { month: 'Jun', 'Node Volume': 12, 'Edge Relations': 11, 'AI Queries': 34 },
];

export const MOCK_PAGERANK = [
  { name: 'Apex Tech Solutions', score: 28.4 },
  { name: 'Priya Sharma',        score: 22.1 },
  { name: 'Nova Retail Group',   score: 18.7 },
  { name: 'CloudBase Systems',   score: 14.3 },
  { name: 'DataEdge Corp',       score: 10.6 },
  { name: 'Jordan Ali',          score: 5.9  },
];

export const MOCK_DOMINANCE = [
  { name: 'Apex Tech Solutions', marketShare: 68 },
  { name: 'DataEdge Corp',       marketShare: 22 },
  { name: 'Nova Retail Group',   marketShare: 48 },
  { name: 'OmniCorp Industries', marketShare: 31 },
];

export const MOCK_USERS_LIST = [
  { id: 'u_admin', name: 'Administrator', email: 'admin@brgi.com', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'u_analyst', name: 'Sarah Connor', email: 'analyst@brgi.com', role: 'ANALYST', status: 'ACTIVE', createdAt: '2026-02-15T00:00:00.000Z' },
  { id: 'u_viewer', name: 'John Doe', email: 'viewer@brgi.com', role: 'VIEWER', status: 'ACTIVE', createdAt: '2026-03-10T00:00:00.000Z' },
];

export const MOCK_AUDIT_LOGS = [
  { id: 'l1', action: 'USER_LOGIN', details: 'User admin@brgi.com logged in successfully.', createdAt: new Date(Date.now() - 3600000).toISOString(), user: { name: 'Administrator', email: 'admin@brgi.com' } },
  { id: 'l2', action: 'GRAPH_RESET', details: 'Graph database successfully reseeded to defaults.', createdAt: new Date(Date.now() - 7200000).toISOString(), user: { name: 'Administrator', email: 'admin@brgi.com' } },
  { id: 'l3', action: 'NODE_ADD', details: 'Created new business node: Nova Retail Group.', createdAt: new Date(Date.now() - 14400000).toISOString(), user: { name: 'Sarah Connor', email: 'analyst@brgi.com' } },
  { id: 'l4', action: 'EDGE_ADD', details: 'Connected Priya Sharma to Apex Tech Solutions via INFLUENCES link.', createdAt: new Date(Date.now() - 18000000).toISOString(), user: { name: 'Sarah Connor', email: 'analyst@brgi.com' } },
];

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', title: 'Circular Loop Risk Detected', message: 'Apex Tech Solutions → CloudBase Systems → Apex Tech Solutions cycle flagged.', type: 'ALERT', read: false, createdAt: new Date().toISOString() },
  { id: 'n2', title: 'System Health Check', message: 'All local intelligence engines operating at peak efficiency.', type: 'SUCCESS', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'n3', title: 'Welcome to BRGI Platform', message: 'Your offline-capable Graph Intelligence environment is ready.', type: 'INFO', read: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

export const MOCK_REPORT = {
  generatedAt: new Date().toISOString(),
  overview: {
    totalNodes: MOCK_NODES.length,
    totalEdges: MOCK_EDGES.length,
    highRiskCount: 2,
    totalCycles: 1,
    communityCount: 3,
  },
  typeCounts: MOCK_STATS.typeCounts,
  topInfluencers: [
    { label: 'Apex Tech Solutions', score: 28.4 },
    { label: 'Priya Sharma', score: 22.1 },
    { label: 'Nova Retail Group', score: 18.7 },
    { label: 'CloudBase Systems', score: 14.3 },
    { label: 'DataEdge Corp', score: 10.6 },
    { label: 'Jordan Ali', score: 5.9 },
  ],
  marketDominance: MOCK_DOMINANCE,
  highRiskEntities: [
    { id: 'n5', label: 'DataEdge Corp', type: 'COMPETITOR', riskScore: 74 },
    { id: 'n1', label: 'Apex Tech Solutions', type: 'BUSINESS', riskScore: 61 },
  ],
  fraudCycles: [
    { id: 'cycle_1', length: 2, nodes: ['Apex Tech Solutions', 'CloudBase Systems'] }
  ],
  communities: [
    { name: 'Community #1 (Tech)', memberCount: 5, members: ['Apex Tech Solutions', 'CloudBase Systems', 'DataEdge Corp', 'Jordan Ali', 'G2 Review — Apex'] },
    { name: 'Community #2 (Retail)', memberCount: 4, members: ['Nova Retail Group', 'SwiftLogistics Ltd', 'Trustpilot — Nova', 'OmniCorp Industries'] },
    { name: 'Community #3 (Influencer Network)', memberCount: 3, members: ['Priya Sharma', 'Maya Chen', 'Prime Parts Co.'] }
  ],
  topPartnerships: [
    { sourceId: 'Apex Tech Solutions', targetId: 'Nova Retail Group', score: 0.85, commonNeighbors: ['Priya Sharma', 'CloudBase Systems'] },
    { sourceId: 'Jordan Ali', targetId: 'Maya Chen', score: 0.40, commonNeighbors: ['Priya Sharma'] }
  ]
};

export const MOCK_COMMUNITIES = {
  n1: 'Community #1 (Tech)',
  n3: 'Community #1 (Tech)',
  n5: 'Community #1 (Tech)',
  n6: 'Community #1 (Tech)',
  n10: 'Community #1 (Tech)',
  n2: 'Community #2 (Retail)',
  n7: 'Community #2 (Retail)',
  n9: 'Community #2 (Retail)',
  n11: 'Community #2 (Retail)',
  n4: 'Community #3 (Influencer Network)',
  n8: 'Community #3 (Influencer Network)',
  n12: 'Community #3 (Influencer Network)',
};

export const MOCK_FRAUD = {
  cycles: [['n1', 'n3']],
  riskScores: {
    n1: 0.61,
    n2: 0.15,
    n3: 0.42,
    n4: 0.05,
    n5: 0.74,
    n6: 0.08,
  }
};

export const MOCK_PARTNERSHIPS = [
  { sourceId: 'n1', targetId: 'n2', score: 0.85, commonNeighbors: ['Priya Sharma', 'CloudBase Systems'] },
  { sourceId: 'n6', targetId: 'n8', score: 0.40, commonNeighbors: ['Priya Sharma'] },
];

export const MOCK_DOMINANCE_ALGO = [
  { name: 'Apex Tech Solutions', nodeCount: 5, marketShare: 68 },
  { name: 'DataEdge Corp', nodeCount: 2, marketShare: 22 },
  { name: 'Nova Retail Group', nodeCount: 3, marketShare: 48 },
  { name: 'OmniCorp Industries', nodeCount: 1, marketShare: 31 },
];

export const MOCK_PATHFIND = [
  ['n3', 'n1', 'n6'],
  ['n12', 'n1', 'n6']
];

export const MOCK_PIE = [
  { name: 'Businesses', value: 2 },
  { name: 'Customers', value: 2 },
  { name: 'Suppliers', value: 3 },
  { name: 'Influencers', value: 1 },
  { name: 'Competitors', value: 2 },
  { name: 'Reviews', value: 2 },
];

export const MOCK_FRAUD_ALERTS = [
  { id: 'fraud_0', title: 'Circular Loop Risk Detected', message: 'Apex Tech Solutions → CloudBase Systems → Apex Tech Solutions cycle flagged.', type: 'danger', nodeIds: ['n1', 'n3'] },
  { id: 'risk_n5', title: 'High Risk Entity Flagged', message: '"DataEdge Corp" (COMPETITOR) has a risk score of 74%.', type: 'warning', nodeIds: ['n5'] },
  { id: 'risk_n1', title: 'High Risk Entity Flagged', message: '"Apex Tech Solutions" (BUSINESS) has a risk score of 61%.', type: 'warning', nodeIds: ['n1'] }
];

