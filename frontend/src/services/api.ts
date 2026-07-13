import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// In production on Vercel: use a relative /api path — Vercel's vercel.json rewrites
// proxy it to the Render backend. No VITE_API_URL env var needed, no CORS issues.
// In local dev: Vite's server.proxy forwards /api → http://localhost:5000/api.
const API_BASE_URL = (import.meta as any).env.PROD
  ? '/api'
  : ((import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api');

// Socket.IO: in production, connect to the Vercel origin (proxy handles /socket.io/*)
// In dev, connect directly to the local backend.
const SOCKET_URL = (import.meta as any).env.PROD
  ? window.location.origin
  : ((import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15-second timeout — prevents hanging on Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('brgi_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor — surface errors clearly in the browser console
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('[BRGI API] Request timed out after 15s — backend may be cold-starting on Render free tier.');
    } else if (!error.response) {
      console.error(
        '[BRGI API] Network Error — no response received.\n' +
        '  Attempted:', error.config?.baseURL, error.config?.url
      );
    } else if (error.response.status === 401) {
      console.warn('[BRGI API] 401 Unauthorized — clearing stale session and reloading.');
      localStorage.removeItem('brgi_token');
      localStorage.removeItem('brgi_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Singleton Socket Connection
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      timeout: 10000,
      path: '/socket.io',
    });
    console.log('[BRGI] Socket.IO connecting to:', SOCKET_URL);
  }
  return socket;
};

