import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import graphRoutes from './routes/graph';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import reportsRoutes from './routes/reports';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Production-aware CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isLocalhost = origin.startsWith('http://localhost:') || 
                        origin.startsWith('https://localhost:') ||
                        origin.startsWith('http://127.0.0.1:') ||
                        origin.startsWith('https://127.0.0.1:') ||
                        origin === 'http://localhost' ||
                        origin === 'http://127.0.0.1';

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*') || isLocalhost) {
      return callback(null, true);
    }
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/auth', authRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export { io };
