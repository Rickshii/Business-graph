import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { graphService } from '../services/graphService';

const router = Router();

// Full Report Summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const [nodes, edges, pageRanks, fraud, dominance, partnerships, communities] = await Promise.all([
      graphService.getNodes(),
      graphService.getEdges(),
      graphService.runPageRank(),
      graphService.runFraudDetection(),
      graphService.runMarketDominance(),
      graphService.runPartnershipPrediction(),
      graphService.runCommunityDetection()
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
    const typeCounts: Record<string, number> = {};
    nodes.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });

    // Community breakdown
    const communityGroups: Record<string, string[]> = {};
    Object.entries(communities).forEach(([nodeId, community]) => {
      if (!communityGroups[community]) communityGroups[community] = [];
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export Report as CSV
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const [nodes, edges, pageRanks, fraud] = await Promise.all([
      graphService.getNodes(),
      graphService.getEdges(),
      graphService.runPageRank(),
      graphService.runFraudDetection()
    ]);

    const lines: string[] = [
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
