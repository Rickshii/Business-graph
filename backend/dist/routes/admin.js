"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const graphService_1 = require("../services/graphService");
const auth_1 = require("./auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// In-memory fallback store for notifications and audit logs
const mockAuditLogs = [
    { id: '1', action: 'SYSTEM_STARTUP', details: 'BRGI platform initialized. Fallback Graph Engine active.', userId: null, createdAt: new Date(Date.now() - 120000) },
    { id: '2', action: 'USER_LOGIN', details: 'admin@brgi.com authenticated successfully.', userId: 'u_admin', createdAt: new Date(Date.now() - 90000) },
    { id: '3', action: 'GRAPH_SEED', details: 'Default mock network of 17 nodes and 22 relationships established.', userId: 'u_admin', createdAt: new Date(Date.now() - 60000) }
];
const mockNotifications = [
    { id: 'n1', title: 'System Online', message: 'BRGI platform is running and graph engine is active.', type: 'SUCCESS', read: false, createdAt: new Date(Date.now() - 120000) },
    { id: 'n2', title: 'Graph Seeded', message: 'Default 17-node network has been loaded into the graph engine.', type: 'INFO', read: false, createdAt: new Date(Date.now() - 60000) }
];
// ─── System Stats ───────────────────────────────────────────────
router.get('/stats', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const graphStatus = graphService_1.graphService.getStatus();
        let userCount = auth_1.mockUsers.length;
        try {
            userCount = await prisma.user.count();
        }
        catch { }
        res.json({
            graphConnected: graphStatus.connected,
            graphEngine: graphStatus.engine,
            totalNodes: graphStatus.nodeCount,
            totalEdges: graphStatus.edgeCount,
            typeCounts: graphStatus.typeCounts || {},
            usersCount: userCount,
            uptime: process.uptime()
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ─── Analytics Trends ────────────────────────────────────────────
router.get('/analytics', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const data = await graphService_1.graphService.getAnalyticsTrends();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ─── User Management ─────────────────────────────────────────────
router.get('/users', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        try {
            const users = await prisma.user.findMany({
                select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(users);
        }
        catch {
            return res.json(auth_1.mockUsers.map(u => ({
                id: u.id, email: u.email, name: u.name,
                role: u.role, status: u.status, createdAt: u.createdAt
            })));
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/users/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { role, status, name } = req.body;
    // Prevent self-demotion
    if (id === req.user?.id && role && role !== 'ADMIN') {
        return res.status(400).json({ error: 'You cannot change your own admin role.' });
    }
    try {
        const updateData = {};
        if (role)
            updateData.role = role;
        if (status)
            updateData.status = status;
        if (name)
            updateData.name = name;
        try {
            const updated = await prisma.user.update({
                where: { id },
                data: updateData,
                select: { id: true, email: true, name: true, role: true, status: true, createdAt: true }
            });
            return res.json(updated);
        }
        catch {
            const mockUser = auth_1.mockUsers.find(u => u.id === id);
            if (!mockUser)
                return res.status(404).json({ error: 'User not found' });
            if (role)
                mockUser.role = role;
            if (status)
                mockUser.status = status;
            if (name)
                mockUser.name = name;
            return res.json({ id: mockUser.id, email: mockUser.email, name: mockUser.name, role: mockUser.role, status: mockUser.status });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/users/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    if (id === req.user?.id)
        return res.status(400).json({ error: 'Cannot delete your own account.' });
    try {
        try {
            await prisma.user.delete({ where: { id } });
            return res.json({ success: true });
        }
        catch {
            const idx = auth_1.mockUsers.findIndex(u => u.id === id);
            if (idx === -1)
                return res.status(404).json({ error: 'User not found' });
            auth_1.mockUsers.splice(idx, 1);
            return res.json({ success: true });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ─── Audit Logs ──────────────────────────────────────────────────
router.get('/logs', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        try {
            const logs = await prisma.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100,
                include: { user: { select: { email: true, name: true } } }
            });
            return res.json(logs);
        }
        catch {
            return res.json(mockAuditLogs);
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/logs', authMiddleware_1.authMiddleware, async (req, res) => {
    const { action, details } = req.body;
    const logEntry = {
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
    }
    catch {
        mockAuditLogs.unshift(logEntry);
        return res.status(201).json(logEntry);
    }
});
// ─── Notifications ────────────────────────────────────────────────
router.get('/notifications', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        try {
            const notifs = await prisma.systemNotification.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            return res.json(notifs);
        }
        catch {
            return res.json(mockNotifications);
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/notifications', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ADMIN']), async (req, res) => {
    const { title, message, type } = req.body;
    if (!title || !message)
        return res.status(400).json({ error: 'Title and message required' });
    try {
        try {
            const notif = await prisma.systemNotification.create({
                data: { title, message, type: type || 'INFO' }
            });
            return res.status(201).json(notif);
        }
        catch {
            const notif = { id: `n_${Date.now()}`, title, message, type: type || 'INFO', read: false, createdAt: new Date() };
            mockNotifications.unshift(notif);
            return res.status(201).json(notif);
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch('/notifications/:id/read', authMiddleware_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        try {
            const notif = await prisma.systemNotification.update({ where: { id }, data: { read: true } });
            return res.json(notif);
        }
        catch {
            const notif = mockNotifications.find(n => n.id === id);
            if (notif)
                notif.read = true;
            return res.json(notif || { id, read: true });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch('/notifications/read-all', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        try {
            await prisma.systemNotification.updateMany({ data: { read: true } });
        }
        catch {
            mockNotifications.forEach(n => { n.read = true; });
        }
        return res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
