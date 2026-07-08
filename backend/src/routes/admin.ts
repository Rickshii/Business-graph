import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';
import { graphService } from '../services/graphService';
import { mockUsers } from './auth';

const prisma = new PrismaClient();
const router = Router();

// In-memory fallback store for notifications and audit logs
const mockAuditLogs: any[] = [
  { id: '1', action: 'SYSTEM_STARTUP', details: 'BRGI platform initialized. Fallback Graph Engine active.', userId: null, createdAt: new Date(Date.now() - 120000) },
  { id: '2', action: 'USER_LOGIN', details: 'admin@brgi.com authenticated successfully.', userId: 'u_admin', createdAt: new Date(Date.now() - 90000) },
  { id: '3', action: 'GRAPH_SEED', details: 'Default mock network of 17 nodes and 22 relationships established.', userId: 'u_admin', createdAt: new Date(Date.now() - 60000) }
];

const mockNotifications: any[] = [
  { id: 'n1', title: 'System Online', message: 'BRGI platform is running and graph engine is active.', type: 'SUCCESS', read: false, createdAt: new Date(Date.now() - 120000) },
  { id: 'n2', title: 'Graph Seeded', message: 'Default 17-node network has been loaded into the graph engine.', type: 'INFO', read: false, createdAt: new Date(Date.now() - 60000) }
];

// ─── System Stats ───────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const graphStatus = graphService.getStatus();

    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch (e: any) {
      console.warn('[Admin Stats] Failed to query user count from PostgreSQL:', e.message);
    }

    res.json({
      graphConnected: graphStatus.connected,
      graphEngine: graphStatus.engine,
      totalNodes: graphStatus.nodeCount,
      totalEdges: graphStatus.edgeCount,
      typeCounts: graphStatus.typeCounts || {},
      usersCount: userCount,
      uptime: process.uptime()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Analytics Trends ────────────────────────────────────────────
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const data = await graphService.getAnalyticsTrends();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── User Management ─────────────────────────────────────────────
router.get('/users', authMiddleware, requireRole(['ADMIN']), async (req, res) => {
  try {
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phone: true,
        company: true,
        lastLogin: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(dbUsers);
  } catch (error: any) {
    console.error('[Admin] Fetch users error:', error?.message);
    res.status(500).json({ error: 'Failed to fetch registered users from database.' });
  }
});

router.put('/users/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { role, status, name, phone, company } = req.body;

  // Prevent self-demotion
  if (id === req.user?.id && role && role !== 'ADMIN') {
    return res.status(400).json({ error: 'You cannot change your own admin role.' });
  }

  // Prevent self-suspension
  if (id === req.user?.id && status === 'SUSPENDED') {
    return res.status(400).json({ error: 'You cannot suspend your own admin account.' });
  }

  try {
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phone: true,
        company: true,
        lastLogin: true,
        createdAt: true
      }
    });
    return res.json(updated);
  } catch (error: any) {
    console.error('[Admin] Update user error:', error?.message);
    res.status(500).json({ error: 'Failed to update user in database.' });
  }
});

router.delete('/users/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (id === req.user?.id) return res.status(400).json({ error: 'Cannot delete your own account.' });

  try {
    await prisma.user.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Admin] Delete user error:', error?.message);
    res.status(500).json({ error: 'Failed to delete user from database.' });
  }
});

// ─── Audit Logs ──────────────────────────────────────────────────
router.get('/logs', authMiddleware, requireRole(['ADMIN']), async (req, res) => {
  try {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { email: true, name: true } } }
      });
      return res.json(logs);
    } catch {
      return res.json(mockAuditLogs);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logs', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { action, details } = req.body;
  const logEntry: any = {
    id: `log_${Date.now()}`,
    action: action || 'GENERIC_ACTION',
    details: details || '',
    userId: req.user?.id || null,
    createdAt: new Date()
  };

  try {
    const log = await prisma.auditLog.create({
      data: { userId: logEntry.userId, action: logEntry.action, details: logEntry.details }
    });
    return res.status(201).json(log);
  } catch {
    mockAuditLogs.unshift(logEntry);
    return res.status(201).json(logEntry);
  }
});

// ─── Notifications ────────────────────────────────────────────────
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    try {
      const notifs = await prisma.systemNotification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      return res.json(notifs);
    } catch {
      return res.json(mockNotifications);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications', authMiddleware, requireRole(['ADMIN']), async (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });

  try {
    try {
      const notif = await prisma.systemNotification.create({
        data: { title, message, type: type || 'INFO' }
      });
      return res.status(201).json(notif);
    } catch {
      const notif = { id: `n_${Date.now()}`, title, message, type: type || 'INFO', read: false, createdAt: new Date() };
      mockNotifications.unshift(notif);
      return res.status(201).json(notif);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/notifications/:id/read', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    try {
      const notif = await prisma.systemNotification.update({ where: { id }, data: { read: true } });
      return res.json(notif);
    } catch {
      const notif = mockNotifications.find(n => n.id === id);
      if (notif) notif.read = true;
      return res.json(notif || { id, read: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    try {
      await prisma.systemNotification.updateMany({ data: { read: true } });
    } catch {
      mockNotifications.forEach(n => { n.read = true; });
    }
    return res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
