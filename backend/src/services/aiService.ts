import { graphService } from './graphService';

class AIService {
  public async queryKnowledgeGraph(prompt: string): Promise<{ answer: string; nodes: any[]; edges: any[]; suggestions?: string[] }> {
    const nodes = await graphService.getNodes();
    const edges = await graphService.getEdges();
    const cleanPrompt = prompt.toLowerCase();

    let matchedNodes: any[] = [];
    let matchedEdges: any[] = [];
    let answer = "";
    let suggestions: string[] = [];

    // 1. Analyze for PageRank/Influence
    if (cleanPrompt.includes('influence') || cleanPrompt.includes('pagerank') || cleanPrompt.includes('popular') || cleanPrompt.includes('central')) {
      const ranks = await graphService.runPageRank();
      const sortedRanks = Object.entries(ranks).sort((a, b) => b[1] - a[1]);
      
      const leaderDetails = sortedRanks.slice(0, 3).map(([id, rank]) => {
        const node = nodes.find(n => n.id === id);
        return `**${node?.label}** (${node?.type}, score: ${(rank * 100).toFixed(2)}%)`;
      }).join(', ');

      answer = `Based on the PageRank algorithm, the top 3 most influential nodes in the Knowledge Graph are: ${leaderDetails}.\n\nThese entities have the highest structural centrality, meaning they have many direct links or are connected to other highly connected nodes in the business network.`;
      
      // Return these top nodes for graph visualization
      const topIds = sortedRanks.slice(0, 5).map(([id]) => id);
      matchedNodes = nodes.filter(n => topIds.includes(n.id));
      matchedEdges = edges.filter(e => topIds.includes(e.sourceId) || topIds.includes(e.targetId));
      suggestions = ["Show circular relationships", "Who are the suppliers of Apex Tech Solutions?", "Show market share analysis"];
    }

    // 2. Analyze for Fraud
    else if (cleanPrompt.includes('fraud') || cleanPrompt.includes('circular') || cleanPrompt.includes('risk') || cleanPrompt.includes('loop')) {
      const fraudData = await graphService.runFraudDetection();
      const numCycles = fraudData.cycles.length;
      const highRiskNodes = Object.entries(fraudData.riskScores)
        .filter(([_, score]) => score > 0.4)
        .map(([id, score]) => {
          const node = nodes.find(n => n.id === id);
          return `${node?.label} (Risk: ${Math.round(score * 100)}%)`;
        });

      answer = `### Fraud Analysis Report\n\n- **Circular Transactions Found**: ${numCycles}\n- **High Risk Entities Identified**: ${highRiskNodes.length > 0 ? highRiskNodes.join(', ') : 'None'}\n\n**Details**:\n`;
      if (numCycles > 0) {
        answer += `Circular loops indicate potential shell company billing, money laundering, or collusive marketing reviews. I have flagged these nodes on your visual interface.\n\n`;
        fraudData.cycles.forEach((cycle, index) => {
          const names = cycle.map(id => nodes.find(n => n.id === id)?.label || id).join(' → ');
          answer += `* Cycle #${index + 1}: ${names} → ${nodes.find(n => n.id === cycle[0])?.label}\n`;
        });
      } else {
        answer += `No significant loops or circular relations found. The transactional and review networks look regular and direct.\n`;
      }

      // Filter nodes involved in risk
      const flaggedIds = new Set<string>();
      fraudData.cycles.forEach(c => c.forEach(id => flaggedIds.add(id)));
      Object.keys(fraudData.riskScores).forEach(id => {
        if (fraudData.riskScores[id] > 0.4) flaggedIds.add(id);
      });

      matchedNodes = nodes.filter(n => flaggedIds.has(n.id));
      matchedEdges = edges.filter(e => flaggedIds.has(e.sourceId) && flaggedIds.has(e.targetId));
      suggestions = ["Show PageRank scores", "Recommend partnerships", "What is Apex Tech Solutions' market share?"];
    }

    // 3. Analyze for Supply Chain
    else if (cleanPrompt.includes('supply') || cleanPrompt.includes('supplier') || cleanPrompt.includes('delivery') || cleanPrompt.includes('ship')) {
      const suppliers = nodes.filter(n => n.type === 'SUPPLIER');
      const businesses = nodes.filter(n => n.type === 'BUSINESS');

      answer = `### Supply Chain Structure\n\nThere are **${suppliers.length}** active suppliers feeding into your **${businesses.length}** core business entities.\n\n**Notable Supply Pipelines**:\n`;
      
      suppliers.forEach(s => {
        const clients = edges
          .filter(e => e.sourceId === s.id && e.type === 'SUPPLIES')
          .map(e => nodes.find(n => n.id === e.targetId)?.label || e.targetId);
        
        if (clients.length > 0) {
          answer += `- **${s.label}** (${s.properties.material || 'Materials'}) supplies: *${clients.join(', ')}*\n`;
        }
      });

      matchedNodes = [...suppliers, ...businesses];
      const supplierIds = new Set(matchedNodes.map(n => n.id));
      matchedEdges = edges.filter(e => supplierIds.has(e.sourceId) && supplierIds.has(e.targetId));
      suggestions = ["Show circular relationships", "Recommend partnerships", "Find shortest path from s1 to b2"];
    }

    // 4. Competitors / Market Dominance
    else if (cleanPrompt.includes('competitor') || cleanPrompt.includes('market share') || cleanPrompt.includes('dominance') || cleanPrompt.includes('compet')) {
      const dominance = await graphService.runMarketDominance();
      const shareList = dominance.map(d => `- **${d.name}**: ${d.marketShare}% market share (${d.nodeCount} customer connections)`).join('\n');
      
      answer = `### Market Dominance Analysis\n\nHere is the current breakdown of customer volume shares among competing brands:\n\n${shareList}\n\n**Recommendations**:\nApex Tech Solutions has strong positioning but should watch competitive threats from Quantum Tech and Nova Corp in B2B customer networks.`;
      
      matchedNodes = nodes.filter(n => n.type === 'BUSINESS' || n.type === 'COMPETITOR' || n.type === 'CUSTOMER');
      const matchedIds = new Set(matchedNodes.map(n => n.id));
      matchedEdges = edges.filter(e => matchedIds.has(e.sourceId) && matchedIds.has(e.targetId));
      suggestions = ["Recommend partnerships", "Calculate PageRank influence", "Show circular relationships"];
    }

    // 5. Partnership Prediction
    else if (cleanPrompt.includes('partner') || cleanPrompt.includes('predict') || cleanPrompt.includes('recommend')) {
      const preds = await graphService.runPartnershipPrediction();
      
      answer = `### Partnership Predictions (Graph AI Link Prediction)\n\nUsing common neighbor Jaccard similarity, I recommend the following alliances:\n\n`;
      if (preds.length > 0) {
        preds.slice(0, 3).forEach(p => {
          const sLabel = nodes.find(n => n.id === p.sourceId)?.label;
          const tLabel = nodes.find(n => n.id === p.targetId)?.label;
          answer += `- **${sLabel}** & **${tLabel}** (Match: **${Math.round(p.score * 100)}%**)\n  *Reason*: Shared common relationships with: *${p.commonNeighbors.join(', ')}*\n`;
        });
      } else {
        answer += `No strong partnership recommendations at this moment. Most networks are fully saturated.\n`;
      }

      matchedNodes = nodes.filter(n => n.type === 'BUSINESS' || n.type === 'COMPETITOR');
      const bIds = new Set(matchedNodes.map(n => n.id));
      matchedEdges = edges.filter(e => bIds.has(e.sourceId) && bIds.has(e.targetId));
      suggestions = ["Who is our most influential entity?", "Show fraud risk scores", "List active suppliers"];
    }

    // 6. Generic / Search Nodes
    else {
      // Find matching nodes by label or property search
      const queryWords = cleanPrompt.split(' ');
      matchedNodes = nodes.filter(n => 
        queryWords.some(w => n.label.toLowerCase().includes(w) || n.type.toLowerCase().includes(w))
      );

      if (matchedNodes.length > 0) {
        const nodeLabels = matchedNodes.map(n => `**${n.label}** (${n.type})`).join(', ');
        answer = `I found **${matchedNodes.length}** nodes in the Graph matches your search: ${nodeLabels}.\n\nI have rendered these nodes on the sidebar. Would you like me to highlight their connections or run PageRank influence scoring on them?`;
        
        const matchedIds = new Set(matchedNodes.map(n => n.id));
        matchedEdges = edges.filter(e => matchedIds.has(e.sourceId) || matchedIds.has(e.targetId));
      } else {
        answer = `I couldn't find any direct matches in the graph for "${prompt}".\n\nTry asking queries related to: **"influence scoring"**, **"fraud risk"**, **"supply chain logistics"**, or **"market dominance"**.`;
      }
      suggestions = ["Show PageRank scores", "Show circular relationships", "List active suppliers"];
    }

    return {
      answer,
      nodes: matchedNodes,
      edges: matchedEdges,
      suggestions
    };
  }
}

export const aiService = new AIService();
