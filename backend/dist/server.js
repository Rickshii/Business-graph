"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const graph_1 = __importDefault(require("./routes/graph"));
const ai_1 = __importDefault(require("./routes/ai"));
const admin_1 = __importDefault(require("./routes/admin"));
const reports_1 = __importDefault(require("./routes/reports"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Production-aware CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. Postman, server-to-server)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }
});
exports.io = io;
const PORT = process.env.PORT || 5000;
// Middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        env: process.env.NODE_ENV || 'development'
    });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/graph', graph_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/reports', reports_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
// Socket.IO
io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);
    socket.emit('info', { message: 'Connected to BRGI live stream.' });
    socket.on('graph:update', (data) => { io.emit('graph:changed', data); });
    socket.on('risk:alert', (data) => { io.emit('risk:flagged', data); });
    socket.on('disconnect', () => { console.log(`Socket disconnected: ${socket.id}`); });
});
// Start
server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  BRGI Backend Server running on port ${PORT}`);
    console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Allowed Origins: ${allowedOrigins.join(', ')}`);
    console.log(`==================================================`);
});
