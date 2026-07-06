"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const graphService_1 = require("../services/graphService");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Retrieve Graph Schema Status
router.get('/status', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const status = graphService_1.graphService.getStatus();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Search Nodes
router.get('/nodes/search', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { q = '', type = 'ALL' } = req.query;
        const nodes = await graphService_1.graphService.searchNodes(q, type);
        res.json(nodes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Export Graph
router.get('/export', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const data = await graphService_1.graphService.exportGraph(format);
        const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
        const filename = `brgi-graph-export-${Date.now()}.${format}`;
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Analytics Trends
router.get('/analytics/trends', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const data = await graphService_1.graphService.getAnalyticsTrends();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Nodes - GET all
router.get('/nodes', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const nodes = await graphService_1.graphService.getNodes();
        res.json(nodes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Nodes - POST create
router.post('/nodes', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN', 'ANALYST']), async (req, res) => {
    try {
        const { label, type, properties } = req.body;
        if (!label || !type) {
            return res.status(400).json({ error: 'Label and Type are required' });
        }
        const node = await graphService_1.graphService.addNode({ label, type, properties: properties || {} });
        res.status(201).json(node);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Nodes - PUT update
router.put('/nodes/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN', 'ANALYST']), async (req, res) => {
    try {
        const { label, type, properties } = req.body;
        const updated = await graphService_1.graphService.updateNode(req.params.id, {
            ...(label !== undefined ? { label } : {}),
            ...(type !== undefined ? { type } : {}),
            ...(properties !== undefined ? { properties } : {})
        });
        if (!updated)
            return res.status(404).json({ error: 'Node not found' });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Nodes - DELETE
router.delete('/nodes/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN', 'ANALYST']), async (req, res) => {
    try {
        const deleted = await graphService_1.graphService.deleteNode(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Node not found' });
        res.json({ success: true, message: 'Node deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Edges - GET all
router.get('/edges', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const edges = await graphService_1.graphService.getEdges();
        res.json(edges);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Edges - POST create
router.post('/edges', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN', 'ANALYST']), async (req, res) => {
    try {
        const { sourceId, targetId, type, weight, properties } = req.body;
        if (!sourceId || !targetId || !type) {
            return res.status(400).json({ error: 'SourceId, TargetId, and Type are required' });
        }
        const edge = await graphService_1.graphService.addEdge({
            sourceId,
            targetId,
            type,
            weight: weight ? parseFloat(weight) : 1.0,
            properties: properties || {}
        });
        res.status(201).json(edge);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Edges - PUT update
router.put('/edges/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN', 'ANALYST']), async (req, res) => {
    try {
        const { type, weight, properties } = req.body;
        const updated = await graphService_1.graphService.updateEdge(req.params.id, {
            ...(type !== undefined ? { type } : {}),
            ...(weight !== undefined ? { weight: parseFloat(weight) } : {}),
            ...(properties !== undefined ? { properties } : {})
        });
        if (!updated)
            return res.status(404).json({ error: 'Edge not found' });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Edges - DELETE
router.delete('/edges/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN', 'ANALYST']), async (req, res) => {
    try {
        const deleted = await graphService_1.graphService.deleteEdge(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Edge not found' });
        res.json({ success: true, message: 'Edge deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Graph Algorithms
router.get('/algorithms/pagerank', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const ranks = await graphService_1.graphService.runPageRank();
        res.json(ranks);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/algorithms/community', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const groups = await graphService_1.graphService.runCommunityDetection();
        res.json(groups);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/algorithms/fraud', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const results = await graphService_1.graphService.runFraudDetection();
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/algorithms/supply-chain', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { sourceId, targetId } = req.query;
        if (!sourceId || !targetId) {
            return res.status(400).json({ error: 'sourceId and targetId queries are required' });
        }
        const paths = await graphService_1.graphService.runSupplyChain(sourceId, targetId);
        res.json(paths);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/algorithms/market-dominance', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const dominance = await graphService_1.graphService.runMarketDominance();
        res.json(dominance);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/algorithms/partnership-prediction', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const predictions = await graphService_1.graphService.runPartnershipPrediction();
        res.json(predictions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Reset and Seed Mock Dataset
router.post('/reset', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        await graphService_1.graphService.resetGraph();
        res.json({ success: true, message: 'Graph successfully reset to default sample dataset.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
