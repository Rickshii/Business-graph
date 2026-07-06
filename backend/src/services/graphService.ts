import neo4j, { Driver, Session } from 'neo4j-driver';

export interface GraphNode {
  id: string;
  label: string;
  type: 'BUSINESS' | 'CUSTOMER' | 'SUPPLIER' | 'INFLUENCER' | 'COMPETITOR' | 'REVIEW';
  properties: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'BUYS_FROM' | 'SUPPLIES' | 'INFLUENCES' | 'COMPETES' | 'REVIEWS';
  weight: number;
  properties: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

class GraphService {
  private driver: Driver | null = null;
  private isNeo4jConnected = false;

  // Fallback In-Memory Graph Data
  private mockNodes: Map<string, GraphNode> = new Map();
  private mockEdges: Map<string, GraphEdge> = new Map();

  constructor() {
    this.initializeNeo4j();
    this.seedDefaultMockData();
  }

  private async initializeNeo4j() {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD;

    if (uri && password) {
      try {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        // Test connection
        await this.driver.verifyConnectivity();
        this.isNeo4jConnected = true;
        console.log('Neo4j Graph Database connected successfully.');
      } catch (error) {
        console.warn('Failed to connect to Neo4j. Falling back to local Graph Engine. Error:', error);
        this.driver = null;
        this.isNeo4jConnected = false;
      }
    } else {
      console.log('Neo4j credentials not fully provided. Running in Fallback local Graph Engine mode.');
    }
  }

  private seedDefaultMockData() {
    // Seed standard node dataset
    const nodes: GraphNode[] = [
      { id: 'b1', label: 'Apex Tech Solutions', type: 'BUSINESS', properties: { sector: 'Software', employees: 1200, revenue: '150M' } },
      { id: 'b2', label: 'Starlight Retail', type: 'BUSINESS', properties: { sector: 'Ecommerce', employees: 340, revenue: '45M' } },
      { id: 'b3', label: 'Vortex Logistics', type: 'BUSINESS', properties: { sector: 'Transportation', employees: 890, revenue: '110M' } },
      
      { id: 'c1', label: 'Alice Cooper', type: 'CUSTOMER', properties: { tier: 'Platinum', lifetimeValue: 12500, location: 'New York' } },
      { id: 'c2', label: 'David Miller', type: 'CUSTOMER', properties: { tier: 'Gold', lifetimeValue: 7800, location: 'San Francisco' } },
      { id: 'c3', label: 'Emma Watson', type: 'CUSTOMER', properties: { tier: 'Silver', lifetimeValue: 3200, location: 'London' } },
      { id: 'c4', label: 'Frank Castle', type: 'CUSTOMER', properties: { tier: 'Platinum', lifetimeValue: 15000, location: 'Chicago' } },
      
      { id: 's1', label: 'Silicon Foundries Inc', type: 'SUPPLIER', properties: { material: 'Microchips', reliability: 0.98, country: 'Taiwan' } },
      { id: 's2', label: 'Global Cargo Logistics', type: 'SUPPLIER', properties: { material: 'Shipping', reliability: 0.92, country: 'Germany' } },
      { id: 's3', label: 'Apex Hosting Services', type: 'SUPPLIER', properties: { material: 'Cloud Infra', reliability: 0.99, country: 'USA' } },
      
      { id: 'i1', label: 'Marques Brownlee', type: 'INFLUENCER', properties: { platform: 'YouTube', followers: 18000000, niche: 'Technology' } },
      { id: 'i2', label: 'Sarah Jenkins', type: 'INFLUENCER', properties: { platform: 'LinkedIn', followers: 250000, niche: 'B2B SaaS' } },
      
      { id: 'comp1', label: 'Nova Corp', type: 'COMPETITOR', properties: { marketShare: '22%', headquarters: 'Boston' } },
      { id: 'comp2', label: 'Quantum Tech', type: 'COMPETITOR', properties: { marketShare: '18%', headquarters: 'Seattle' } },
      
      { id: 'r1', label: 'Apex Tech Review #1', type: 'REVIEW', properties: { rating: 5, sentiment: 'Positive', verified: true } },
      { id: 'r2', label: 'Starlight Retail Review #1', type: 'REVIEW', properties: { rating: 2, sentiment: 'Negative', verified: false } },
      { id: 'r3', label: 'Apex Tech Review #2', type: 'REVIEW', properties: { rating: 5, sentiment: 'Positive', verified: true } }
    ];

    const edges: GraphEdge[] = [
      // Supply connections
      { id: 'e1', sourceId: 's1', targetId: 'b1', type: 'SUPPLIES', weight: 0.9, properties: { contract: 'Annual' } },
      { id: 'e2', sourceId: 's3', targetId: 'b1', type: 'SUPPLIES', weight: 0.95, properties: { SLA: '99.99%' } },
      { id: 'e3', sourceId: 's2', targetId: 'b2', type: 'SUPPLIES', weight: 0.85, properties: { transportMode: 'Air' } },
      { id: 'e4', sourceId: 's2', targetId: 'b3', type: 'SUPPLIES', weight: 0.9, properties: { transportMode: 'Sea' } },

      // Business relations
      { id: 'e5', sourceId: 'b3', targetId: 'b2', type: 'SUPPLIES', weight: 0.8, properties: { function: 'Last Mile' } },

      // Customer buys
      { id: 'e6', sourceId: 'c1', targetId: 'b1', type: 'BUYS_FROM', weight: 1.0, properties: { lastPurchase: '2026-06-15' } },
      { id: 'e7', sourceId: 'c2', targetId: 'b1', type: 'BUYS_FROM', weight: 0.8, properties: { lastPurchase: '2026-05-20' } },
      { id: 'e8', sourceId: 'c3', targetId: 'b2', type: 'BUYS_FROM', weight: 0.5, properties: { lastPurchase: '2026-06-01' } },
      { id: 'e9', sourceId: 'c4', targetId: 'b2', type: 'BUYS_FROM', weight: 1.0, properties: { lastPurchase: '2026-06-25' } },
      { id: 'e10', sourceId: 'c1', targetId: 'b2', type: 'BUYS_FROM', weight: 0.6, properties: { lastPurchase: '2026-04-10' } },

      // Influencers
      { id: 'e11', sourceId: 'i1', targetId: 'b1', type: 'INFLUENCES', weight: 0.95, properties: { campaign: 'Launch V2' } },
      { id: 'e12', sourceId: 'i2', targetId: 'b1', type: 'INFLUENCES', weight: 0.8, properties: { campaign: 'Webinar' } },
      { id: 'e13', sourceId: 'i1', targetId: 'c1', type: 'INFLUENCES', weight: 0.75, properties: { channel: 'Organic Video' } },
      { id: 'e14', sourceId: 'i2', targetId: 'c2', type: 'INFLUENCES', weight: 0.65, properties: { channel: 'Post Share' } },

      // Competitors
      { id: 'e15', sourceId: 'b1', targetId: 'comp1', type: 'COMPETES', weight: 0.8, properties: { intensity: 'High' } },
      { id: 'e16', sourceId: 'b1', targetId: 'comp2', type: 'COMPETES', weight: 0.6, properties: { intensity: 'Medium' } },

      // Reviews
      { id: 'e17', sourceId: 'r1', targetId: 'b1', type: 'REVIEWS', weight: 1.0, properties: {} },
      { id: 'e18', sourceId: 'r2', targetId: 'b2', type: 'REVIEWS', weight: 0.2, properties: {} },
      { id: 'e19', sourceId: 'r3', targetId: 'b1', type: 'REVIEWS', weight: 1.0, properties: {} },
      
      // Review Author links (linking customer to reviews)
      { id: 'e20', sourceId: 'c1', targetId: 'r1', type: 'INFLUENCES', weight: 1.0, properties: { relation: 'Author' } },
      { id: 'e21', sourceId: 'c3', targetId: 'r2', type: 'INFLUENCES', weight: 1.0, properties: { relation: 'Author' } },
      // Circular/collusive links for fraud detection demo (c2 -> reviews r3 -> b1 -> reviews r3?)
      // Let's create a cycle: b2 pays i2, i2 reviews b2 favorably, etc. Or circular supplies: b2 -> b3 -> b2.
      { id: 'e22', sourceId: 'b2', targetId: 'b3', type: 'BUYS_FROM', weight: 0.7, properties: { loop: true } }
    ];

    nodes.forEach(n => this.mockNodes.set(n.id, n));
    edges.forEach(e => this.mockEdges.set(e.id, e));
  }

  public getStatus() {
    const nodes = Array.from(this.mockNodes.values());
    const typeCounts: Record<string, number> = {};
    nodes.forEach(n => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });
    return {
      connected: this.isNeo4jConnected,
      engine: this.isNeo4jConnected ? 'Neo4j Graph Database' : 'Local Graph Logic Engine',
      nodeCount: this.mockNodes.size,
      edgeCount: this.mockEdges.size,
      typeCounts
    };
  }

  // Node CRUD
  public async getNodes(): Promise<GraphNode[]> {
    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        const result = await session.run('MATCH (n) RETURN n');
        return result.records.map(record => {
          const node = record.get('n');
          return {
            id: node.properties.id || node.elementId,
            label: node.properties.label,
            type: node.labels[0] as any,
            properties: node.properties
          };
        });
      } finally {
        await session.close();
      }
    }
    return Array.from(this.mockNodes.values());
  }

  public async addNode(node: Omit<GraphNode, 'id'> & { id?: string }): Promise<GraphNode> {
    const id = node.id || `n_${Date.now()}`;
    const newNode: GraphNode = { ...node, id, properties: node.properties || {} };

    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        await session.run(
          `CREATE (n:${newNode.type} {id: $id, label: $label, properties: $properties}) RETURN n`,
          { id, label: newNode.label, properties: JSON.stringify(newNode.properties) }
        );
      } finally {
        await session.close();
      }
    }
    this.mockNodes.set(id, newNode);
    return newNode;
  }

  public async updateNode(id: string, updates: Partial<Omit<GraphNode, 'id'>>): Promise<GraphNode | null> {
    const existing = this.mockNodes.get(id);
    if (!existing) return null;
    const updated: GraphNode = {
      ...existing,
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.type !== undefined ? { type: updates.type } : {}),
      ...(updates.properties !== undefined ? { properties: { ...existing.properties, ...updates.properties } } : {}),
      updatedAt: new Date().toISOString()
    };
    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        await session.run(
          `MATCH (n {id: $id}) SET n.label = $label, n.properties = $properties RETURN n`,
          { id, label: updated.label, properties: JSON.stringify(updated.properties) }
        );
      } finally {
        await session.close();
      }
    }
    this.mockNodes.set(id, updated);
    return updated;
  }

  public async deleteNode(id: string): Promise<boolean> {
    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        await session.run('MATCH (n {id: $id}) DETACH DELETE n', { id });
      } finally {
        await session.close();
      }
    }
    const existed = this.mockNodes.delete(id);
    // Cascade delete edges
    for (const [edgeId, edge] of this.mockEdges.entries()) {
      if (edge.sourceId === id || edge.targetId === id) {
        this.mockEdges.delete(edgeId);
      }
    }
    return existed;
  }

  // Edge CRUD
  public async getEdges(): Promise<GraphEdge[]> {
    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        const result = await session.run('MATCH (s)-[r]->(t) RETURN s.id, t.id, type(r), r');
        return result.records.map(record => {
          const edge = record.get('r');
          return {
            id: edge.properties.id || edge.elementId,
            sourceId: record.get('s.id'),
            targetId: record.get('t.id'),
            type: record.get('type(r)') as any,
            weight: edge.properties.weight || 1.0,
            properties: edge.properties
          };
        });
      } finally {
        await session.close();
      }
    }
    return Array.from(this.mockEdges.values());
  }

  public async addEdge(edge: Omit<GraphEdge, 'id'> & { id?: string }): Promise<GraphEdge> {
    const id = edge.id || `e_${Date.now()}`;
    const newEdge: GraphEdge = { ...edge, id, properties: edge.properties || {} };

    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        await session.run(
          `MATCH (s {id: $sourceId}), (t {id: $targetId})
           CREATE (s)-[r:${newEdge.type} {id: $id, weight: $weight, properties: $properties}]->(t)
           RETURN r`,
          {
            sourceId: newEdge.sourceId,
            targetId: newEdge.targetId,
            id,
            weight: newEdge.weight,
            properties: JSON.stringify(newEdge.properties)
          }
        );
      } finally {
        await session.close();
      }
    }
    this.mockEdges.set(id, newEdge);
    return newEdge;
  }

  public async updateEdge(id: string, updates: Partial<Omit<GraphEdge, 'id' | 'sourceId' | 'targetId'>>): Promise<GraphEdge | null> {
    const existing = this.mockEdges.get(id);
    if (!existing) return null;
    const updated: GraphEdge = {
      ...existing,
      ...(updates.type !== undefined ? { type: updates.type } : {}),
      ...(updates.weight !== undefined ? { weight: updates.weight } : {}),
      ...(updates.properties !== undefined ? { properties: { ...existing.properties, ...updates.properties } } : {}),
      updatedAt: new Date().toISOString()
    };
    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        await session.run(
          `MATCH ()-[r {id: $id}]->() SET r.weight = $weight, r.properties = $properties RETURN r`,
          { id, weight: updated.weight, properties: JSON.stringify(updated.properties) }
        );
      } finally {
        await session.close();
      }
    }
    this.mockEdges.set(id, updated);
    return updated;
  }

  public async deleteEdge(id: string): Promise<boolean> {
    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        await session.run('MATCH ()-[r {id: $id}]->() DELETE r', { id });
      } finally {
        await session.close();
      }
    }
    return this.mockEdges.delete(id);
  }

  public async resetGraph(): Promise<void> {
    if (this.isNeo4jConnected && this.driver) {
      const session = this.driver.session();
      try {
        await session.run('MATCH (n) DETACH DELETE n');
      } finally {
        await session.close();
      }
    }
    this.mockNodes.clear();
    this.mockEdges.clear();
    this.seedDefaultMockData();
  }

  // --- Graph AI / Algorithms ---

  // 1. PageRank (Influence Scoring)
  public async runPageRank(iterations = 20, dampingFactor = 0.85): Promise<Record<string, number>> {
    const nodes = Array.from(this.mockNodes.keys());
    const n = nodes.length;
    if (n === 0) return {};

    // Initialize PageRank scores
    const ranks: Record<string, number> = {};
    nodes.forEach(id => {
      ranks[id] = 1 / n;
    });

    // Helper: outgoing links count
    const outEdges = Array.from(this.mockEdges.values());
    const outgoingCount: Record<string, number> = {};
    const incomingNeighbors: Record<string, string[]> = {};

    nodes.forEach(id => {
      outgoingCount[id] = 0;
      incomingNeighbors[id] = [];
    });

    outEdges.forEach(edge => {
      if (outgoingCount[edge.sourceId] !== undefined) {
        outgoingCount[edge.sourceId]++;
      }
      if (incomingNeighbors[edge.targetId] !== undefined) {
        incomingNeighbors[edge.targetId].push(edge.sourceId);
      }
    });

    // PageRank Iteration loop
    for (let iter = 0; iter < iterations; iter++) {
      const nextRanks: Record<string, number> = {};
      let sinkSum = 0;

      // Handle sink nodes (nodes with no outgoing links)
      nodes.forEach(id => {
        if (outgoingCount[id] === 0) {
          sinkSum += ranks[id];
        }
      });

      nodes.forEach(id => {
        let incomingSum = 0;
        incomingNeighbors[id].forEach(srcId => {
          incomingSum += ranks[srcId] / outgoingCount[srcId];
        });

        // Distribute sink node rank and apply damping factor
        nextRanks[id] = (1 - dampingFactor) / n + dampingFactor * (incomingSum + sinkSum / n);
      });

      // Update ranks
      nodes.forEach(id => {
        ranks[id] = nextRanks[id];
      });
    }

    return ranks;
  }

  // 2. Community Detection (Label Propagation algorithm simulation)
  public async runCommunityDetection(): Promise<Record<string, string>> {
    const nodes = Array.from(this.mockNodes.keys());
    const edges = Array.from(this.mockEdges.values());

    const communities: Record<string, string> = {};
    nodes.forEach(id => {
      communities[id] = id; // Each node starts in its own community
    });

    // Construct adjacency map (undirected for community layout mapping)
    const adj: Record<string, string[]> = {};
    nodes.forEach(id => (adj[id] = []));
    edges.forEach(edge => {
      if (adj[edge.sourceId] && adj[edge.targetId]) {
        adj[edge.sourceId].push(edge.targetId);
        adj[edge.targetId].push(edge.sourceId);
      }
    });

    // Run label propagation iterations
    const maxIterations = 5;
    for (let iter = 0; iter < maxIterations; iter++) {
      // Shuffle node access order to avoid bias
      const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
      let changed = false;

      shuffledNodes.forEach(nodeId => {
        const neighbors = adj[nodeId];
        if (neighbors.length === 0) return;

        // Count labels among neighbors
        const labelCounts: Record<string, number> = {};
        neighbors.forEach(neighId => {
          const label = communities[neighId];
          labelCounts[label] = (labelCounts[label] || 0) + 1;
        });

        // Find most popular label
        let maxLabel = communities[nodeId];
        let maxCount = 0;
        for (const [label, count] of Object.entries(labelCounts)) {
          if (count > maxCount) {
            maxCount = count;
            maxLabel = label;
          }
        }

        if (communities[nodeId] !== maxLabel) {
          communities[nodeId] = maxLabel;
          changed = true;
        }
      });

      if (!changed) break;
    }

    // Normalize group IDs to friendly indices "Community A", "Community B"
    const uniqueLabels = Array.from(new Set(Object.values(communities)));
    const labelMapping: Record<string, string> = {};
    uniqueLabels.forEach((label, index) => {
      labelMapping[label] = `Community ${String.fromCharCode(65 + (index % 26))}`;
    });

    const normalizedCommunities: Record<string, string> = {};
    for (const [nodeId, label] of Object.entries(communities)) {
      normalizedCommunities[nodeId] = labelMapping[label];
    }

    return normalizedCommunities;
  }

  // 3. Fraud Detection
  // Cycle detection (BFS/DFS) and Multiple review collusion
  public async runFraudDetection(): Promise<{ cycles: string[][]; riskScores: Record<string, number> }> {
    const nodes = Array.from(this.mockNodes.keys());
    const edges = Array.from(this.mockEdges.values());

    // Cycle detection using DFS
    const cycles: string[][] = [];
    const adj: Record<string, string[]> = {};
    nodes.forEach(id => (adj[id] = []));
    edges.forEach(edge => {
      if (adj[edge.sourceId]) adj[edge.sourceId].push(edge.targetId);
    });

    const findCycles = (node: string, visited: Set<string>, path: string[]) => {
      visited.add(node);
      path.push(node);

      const neighbors = adj[node] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          findCycles(neighbor, visited, [...path]);
        } else {
          // Cycle found if neighbor is in active path
          const index = path.indexOf(neighbor);
          if (index !== -1) {
            const cycle = path.slice(index);
            if (cycle.length >= 3) { // Ignore self-loops and simple double arcs
              // Normalize cycle to avoid duplicates
              const sorted = [...cycle].sort();
              const cycleStr = sorted.join('-');
              if (!cycles.some(c => [...c].sort().join('-') === cycleStr)) {
                cycles.push(cycle);
              }
            }
          }
        }
      }
    };

    nodes.forEach(node => {
      findCycles(node, new Set(), []);
    });

    // Risk scoring:
    // High risk if:
    // - Node is part of a transaction cycle.
    // - A Customer reviews a Business they do NOT buy from but have supplier connection with.
    // - Low review rating from accounts that have zero other activity.
    const riskScores: Record<string, number> = {};
    nodes.forEach(nodeId => {
      riskScores[nodeId] = 0.05; // Base risk
    });

    // Increase risk for nodes in cycles
    cycles.forEach(cycle => {
      cycle.forEach(nodeId => {
        if (riskScores[nodeId] !== undefined) {
          riskScores[nodeId] = Math.min(0.95, riskScores[nodeId] + 0.4);
        }
      });
    });

    // Detect review fraud
    const reviewEdges = edges.filter(e => e.type === 'REVIEWS');
    const customerReviewMap: Record<string, string[]> = {}; // cust -> [businessId]
    const customerBuysMap: Record<string, string[]> = {}; // cust -> [businessId]

    edges.forEach(e => {
      if (e.type === 'BUYS_FROM') {
        customerBuysMap[e.sourceId] = customerBuysMap[e.sourceId] || [];
        customerBuysMap[e.sourceId].push(e.targetId);
      }
    });

    // Find if customer reviews business they never bought from
    reviewEdges.forEach(e => {
      // Find author of this review
      const authorEdge = edges.find(ae => ae.targetId === e.sourceId && ae.type === 'INFLUENCES' && ae.properties.relation === 'Author');
      if (authorEdge) {
        const customerId = authorEdge.sourceId;
        const businessId = e.targetId;
        
        customerReviewMap[customerId] = customerReviewMap[customerId] || [];
        customerReviewMap[customerId].push(businessId);

        const bought = customerBuysMap[customerId] || [];
        if (!bought.includes(businessId)) {
          // Unverified purchase review -> suspicious!
          riskScores[customerId] = Math.min(0.9, (riskScores[customerId] || 0) + 0.35);
          riskScores[e.sourceId] = Math.min(0.95, (riskScores[e.sourceId] || 0) + 0.5); // The Review node itself is flagged
          riskScores[businessId] = Math.min(0.8, (riskScores[businessId] || 0) + 0.15); // Slight flag for business
        }
      }
    });

    return { cycles, riskScores };
  }

  // 4. Supply Chain Discovery (Shortest Path and traversals)
  public async runSupplyChain(sourceId: string, targetId: string): Promise<string[][]> {
    const nodes = Array.from(this.mockNodes.keys());
    if (!this.mockNodes.has(sourceId) || !this.mockNodes.has(targetId)) return [];

    const edges = Array.from(this.mockEdges.values());
    const adj: Record<string, string[]> = {};
    nodes.forEach(id => (adj[id] = []));
    
    // We traverse SUPPLIES or BUYS_FROM or generic flows
    edges.forEach(edge => {
      if (adj[edge.sourceId]) adj[edge.sourceId].push(edge.targetId);
    });

    // Find all paths using BFS/DFS up to a depth of 6
    const paths: string[][] = [];
    const traverse = (current: string, target: string, visited: Set<string>, path: string[]) => {
      visited.add(current);
      path.push(current);

      if (current === target) {
        paths.push([...path]);
      } else if (path.length < 6) {
        const neighbors = adj[current] || [];
        for (const neigh of neighbors) {
          if (!visited.has(neigh)) {
            traverse(neigh, target, new Set(visited), [...path]);
          }
        }
      }
    };

    traverse(sourceId, targetId, new Set(), []);
    return paths;
  }

  // 5. Partnership Prediction (Jaccard Link Prediction)
  public async runPartnershipPrediction(): Promise<Array<{ sourceId: string; targetId: string; score: number; commonNeighbors: string[] }>> {
    const nodes = Array.from(this.mockNodes.values());
    const businesses = nodes.filter(n => n.type === 'BUSINESS' || n.type === 'COMPETITOR');
    const edges = Array.from(this.mockEdges.values());

    // Build neighbors map (combining supplies/customers/etc.)
    const neighbors: Record<string, Set<string>> = {};
    businesses.forEach(b => (neighbors[b.id] = new Set()));

    edges.forEach(e => {
      if (neighbors[e.sourceId]) neighbors[e.sourceId].add(e.targetId);
      if (neighbors[e.targetId]) neighbors[e.targetId].add(e.sourceId);
    });

    const predictions: Array<{ sourceId: string; targetId: string; score: number; commonNeighbors: string[] }> = [];

    // Calculate Jaccard similarity between all pairs of businesses
    for (let i = 0; i < businesses.length; i++) {
      for (let j = i + 1; j < businesses.length; j++) {
        const b1 = businesses[i].id;
        const b2 = businesses[j].id;

        // Skip if they already have a direct connection (competitors or business links)
        const directlyConnected = edges.some(e => 
          (e.sourceId === b1 && e.targetId === b2) || (e.sourceId === b2 && e.targetId === b1)
        );
        if (directlyConnected) continue;

        const set1 = neighbors[b1];
        const set2 = neighbors[b2];

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        if (union.size === 0) continue;

        const score = intersection.size / union.size;
        if (score > 0) {
          predictions.push({
            sourceId: b1,
            targetId: b2,
            score: Math.round(score * 100) / 100,
            commonNeighbors: Array.from(intersection).map(nid => this.mockNodes.get(nid)?.label || nid)
          });
        }
      }
    }

    // Sort by score descending
    return predictions.sort((a, b) => b.score - a.score);
  }

  // 6. Market Dominance Analysis
  public async runMarketDominance(): Promise<Array<{ name: string; nodeCount: number; marketShare: number }>> {
    const nodes = Array.from(this.mockNodes.values());
    const edges = Array.from(this.mockEdges.values());

    const businesses = nodes.filter(n => n.type === 'BUSINESS' || n.type === 'COMPETITOR');
    const customerCounts: Record<string, number> = {};
    
    businesses.forEach(b => {
      customerCounts[b.id] = 0;
    });

    let totalCustomerLinks = 0;
    edges.forEach(edge => {
      if (edge.type === 'BUYS_FROM') {
        const target = edge.targetId;
        if (customerCounts[target] !== undefined) {
          customerCounts[target]++;
          totalCustomerLinks++;
        }
      }
    });

    if (totalCustomerLinks === 0) {
      return businesses.map(b => ({ name: b.label, nodeCount: 0, marketShare: 0 }));
    }

    return businesses.map(b => {
      const count = customerCounts[b.id];
      return {
        name: b.label,
        nodeCount: count,
        marketShare: Math.round((count / totalCustomerLinks) * 100)
      };
    }).sort((a, b) => b.marketShare - a.marketShare);
  }
  // Search / Filter Nodes
  public async searchNodes(query: string, type?: string): Promise<GraphNode[]> {
    const nodes = await this.getNodes();
    return nodes.filter(n => {
      const matchesQuery = !query ||
        n.label.toLowerCase().includes(query.toLowerCase()) ||
        Object.values(n.properties).some(v =>
          String(v).toLowerCase().includes(query.toLowerCase())
        );
      const matchesType = !type || type === 'ALL' || n.type === type.toUpperCase();
      return matchesQuery && matchesType;
    });
  }

  // Analytics Trend Data (6-month simulated from graph evolution)
  public async getAnalyticsTrends(): Promise<any> {
    const nodes = Array.from(this.mockNodes.values());
    const edges = Array.from(this.mockEdges.values());
    const nodeCount = nodes.length;
    const edgeCount = edges.length;

    // Simulate 6 months of cumulative growth
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const trend = months.map((month, i) => ({
      month,
      nodes: Math.max(1, Math.round(nodeCount * ((i + 1) / 6) * (0.85 + Math.random() * 0.3))),
      edges: Math.max(1, Math.round(edgeCount * ((i + 1) / 6) * (0.80 + Math.random() * 0.4))),
      queries: Math.round(10 + i * 8 + Math.random() * 15)
    }));

    // Entity type breakdown
    const typeCounts: Record<string, number> = {};
    nodes.forEach(n => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    return { trend, typeCounts, totalNodes: nodeCount, totalEdges: edgeCount };
  }

  // Export Graph as JSON
  public async exportGraph(format: 'json' | 'csv'): Promise<string> {
    const nodes = await this.getNodes();
    const edges = await this.getEdges();

    if (format === 'json') {
      return JSON.stringify({ nodes, edges, exportedAt: new Date().toISOString() }, null, 2);
    }

    // CSV export
    const nodeLines = ['id,label,type,properties'];
    nodes.forEach(n => nodeLines.push(`"${n.id}","${n.label}","${n.type}","${JSON.stringify(n.properties).replace(/"/g, '""')}"`));

    const edgeLines = ['id,sourceId,targetId,type,weight,properties'];
    edges.forEach(e => edgeLines.push(`"${e.id}","${e.sourceId}","${e.targetId}","${e.type}",${e.weight},"${JSON.stringify(e.properties).replace(/"/g, '""')}"`));

    return `=== NODES ===\n${nodeLines.join('\n')}\n\n=== EDGES ===\n${edgeLines.join('\n')}`;
  }
}

export const graphService = new GraphService();
