"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const graphService_1 = require("../services/graphService");
const router = (0, express_1.Router)();
// Full Report Summary
router.get('/summary', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const [nodes, edges, pageRanks, fraud, dominance, partnerships, communities] = await Promise.all([
            graphService_1.graphService.getNodes(),
            graphService_1.graphService.getEdges(),
            graphService_1.graphService.runPageRank(),
            graphService_1.graphService.runFraudDetection(),
            graphService_1.graphService.runMarketDominance(),
            graphService_1.graphService.runPartnershipPrediction(),
            graphService_1.graphService.runCommunityDetection()
        ]);
        // Top influencers by PageRank
        const topInfluencers = Object.entries(pageRanks)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([id, score]) => {
            const node = nodes.find(n => n.id === id);
            return { id, label: node?.label || id, type: node?.type || 'UNKNOWN', score: Math.round(score * 1000) / 10 };
        });
        // High-risk entities
        const highRiskEntities = Object.entries(fraud.riskScores)
            .filter(([_, score]) => score > 0.3)
            .sort((a, b) => b[1] - a[1])
            .map(([id, score]) => {
            const node = nodes.find(n => n.id === id);
            return { id, label: node?.label || id, type: node?.type || 'UNKNOWN', riskScore: Math.round(score * 100) };
        });
        // Entity type breakdown
        const typeCounts = {};
        nodes.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });
        // Community breakdown
        const communityGroups = {};
        Object.entries(communities).forEach(([nodeId, community]) => {
            if (!communityGroups[community])
                communityGroups[community] = [];
            const node = nodes.find(n => n.id === nodeId);
            communityGroups[community].push(node?.label || nodeId);
        });
        const communityList = Object.entries(communityGroups).map(([name, members]) => ({ name, memberCount: members.length, members: members.slice(0, 5) }));
        res.json({
            generatedAt: new Date().toISOString(),
            overview: {
                totalNodes: nodes.length,
                totalEdges: edges.length,
                totalCycles: fraud.cycles.length,
                highRiskCount: highRiskEntities.length,
                communityCount: communityList.length
            },
            typeCounts,
            topInfluencers,
            highRiskEntities,
            fraudCycles: fraud.cycles.map((cycle, i) => ({
                id: `cycle_${i}`,
                nodes: cycle.map(id => nodes.find(n => n.id === id)?.label || id),
                length: cycle.length
            })),
            marketDominance: dominance,
            topPartnerships: partnerships.slice(0, 5),
            communities: communityList
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Export Report as CSV
router.get('/export/csv', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const [nodes, edges, pageRanks, fraud] = await Promise.all([
            graphService_1.graphService.getNodes(),
            graphService_1.graphService.getEdges(),
            graphService_1.graphService.runPageRank(),
            graphService_1.graphService.runFraudDetection()
        ]);
        const lines = [
            '=== BRGI Intelligence Report ===',
            `Generated: ${new Date().toISOString()}`,
            `Total Nodes: ${nodes.length}`,
            `Total Edges: ${edges.length}`,
            '',
            '=== TOP INFLUENCERS (PageRank) ===',
            'Rank,Label,Type,Score'
        ];
        Object.entries(pageRanks)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([id, score], i) => {
            const node = nodes.find(n => n.id === id);
            lines.push(`${i + 1},"${node?.label || id}","${node?.type || ''}",${Math.round(score * 1000) / 10}%`);
        });
        lines.push('', '=== HIGH RISK ENTITIES ===', 'Label,Type,Risk Score');
        Object.entries(fraud.riskScores)
            .filter(([_, s]) => s > 0.3)
            .sort((a, b) => b[1] - a[1])
            .forEach(([id, score]) => {
            const node = nodes.find(n => n.id === id);
            lines.push(`"${node?.label || id}","${node?.type || ''}",${Math.round(score * 100)}%`);
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="brgi-report-${Date.now()}.csv"`);
        res.send(lines.join('\n'));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
