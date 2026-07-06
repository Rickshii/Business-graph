import { Router, Response } from 'express';
import { graphService } from '../services/graphService';
import { authMiddleware, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Retrieve Graph Schema Status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const status = graphService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search Nodes
router.get('/nodes/search', authMiddleware, async (req, res) => {
  try {
    const { q = '', type = 'ALL' } = req.query as { q?: string; type?: string };
    const nodes = await graphService.searchNodes(q, type);
    res.json(nodes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export Graph
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const data = await graphService.exportGraph(format);
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `brgi-graph-export-${Date.now()}.${format}`;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics Trends
router.get('/analytics/trends', authMiddleware, async (req, res) => {
  try {
    const data = await graphService.getAnalyticsTrends();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Nodes - GET all
router.get('/nodes', authMiddleware, async (req, res) => {
  try {
    const nodes = await graphService.getNodes();
    res.json(nodes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Nodes - POST create
router.post('/nodes', authMiddleware, requireRole(['ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const { label, type, properties } = req.body;
    if (!label || !type) {
      return res.status(400).json({ error: 'Label and Type are required' });
    }
    const node = await graphService.addNode({ label, type, properties: properties || {} });
    res.status(201).json(node);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Nodes - PUT update
router.put('/nodes/:id', authMiddleware, requireRole(['ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const { label, type, properties } = req.body;
    const updated = await graphService.updateNode(req.params.id, {
      ...(label !== undefined ? { label } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(properties !== undefined ? { properties } : {})
    });
    if (!updated) return res.status(404).json({ error: 'Node not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Nodes - DELETE
router.delete('/nodes/:id', authMiddleware, requireRole(['ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const deleted = await graphService.deleteNode(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Node not found' });
    res.json({ success: true, message: 'Node deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edges - GET all
router.get('/edges', authMiddleware, async (req, res) => {
  try {
    const edges = await graphService.getEdges();
    res.json(edges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edges - POST create
router.post('/edges', authMiddleware, requireRole(['ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const { sourceId, targetId, type, weight, properties } = req.body;
    if (!sourceId || !targetId || !type) {
      return res.status(400).json({ error: 'SourceId, TargetId, and Type are required' });
    }
    const edge = await graphService.addEdge({
      sourceId,
      targetId,
      type,
      weight: weight ? parseFloat(weight) : 1.0,
      properties: properties || {}
    });
    res.status(201).json(edge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edges - PUT update
router.put('/edges/:id', authMiddleware, requireRole(['ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const { type, weight, properties } = req.body;
    const updated = await graphService.updateEdge(req.params.id, {
      ...(type !== undefined ? { type } : {}),
      ...(weight !== undefined ? { weight: parseFloat(weight) } : {}),
      ...(properties !== undefined ? { properties } : {})
    });
    if (!updated) return res.status(404).json({ error: 'Edge not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edges - DELETE
router.delete('/edges/:id', authMiddleware, requireRole(['ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const deleted = await graphService.deleteEdge(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Edge not found' });
    res.json({ success: true, message: 'Edge deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Graph Algorithms
router.get('/algorithms/pagerank', authMiddleware, async (req, res) => {
  try {
    const ranks = await graphService.runPageRank();
    res.json(ranks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/algorithms/community', authMiddleware, async (req, res) => {
  try {
    const groups = await graphService.runCommunityDetection();
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/algorithms/fraud', authMiddleware, async (req, res) => {
  try {
    const results = await graphService.runFraudDetection();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/algorithms/supply-chain', authMiddleware, async (req, res) => {
  try {
    const { sourceId, targetId } = req.query;
    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId queries are required' });
    }
    const paths = await graphService.runSupplyChain(sourceId as string, targetId as string);
    res.json(paths);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/algorithms/market-dominance', authMiddleware, async (req, res) => {
  try {
    const dominance = await graphService.runMarketDominance();
    res.json(dominance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/algorithms/partnership-prediction', authMiddleware, async (req, res) => {
  try {
    const predictions = await graphService.runPartnershipPrediction();
    res.json(predictions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset and Seed Mock Dataset
router.post('/reset', authMiddleware, requireRole(['ADMIN']), async (req, res) => {
  try {
    await graphService.resetGraph();
    res.json({ success: true, message: 'Graph successfully reset to default sample dataset.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
