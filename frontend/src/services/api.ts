import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000';

// Warn loudly in production if the env var is missing (baked into the bundle at build time)
if ((import.meta as any).env.PROD && !((import.meta as any).env.VITE_API_URL)) {
  console.error(
    '[BRGI] VITE_API_URL is not set! The app will try to reach http://localhost:5000 ' +
    'which WILL fail in production. Set VITE_API_URL in your Vercel environment variables ' +
    'to your Render backend URL (e.g. https://brgi-backend.onrender.com/api).'
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15-second timeout — prevents hanging requests
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

// Response interceptor — surface 401/403 and network errors clearly in console
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('[BRGI API] Request timed out after 15s. Backend may be sleeping (cold start). URL:', error.config?.url);
    } else if (!error.response) {
      console.error(
        '[BRGI API] Network Error — no response received. Likely causes:\n' +
        '  1. VITE_API_URL is not set in Vercel → app is calling localhost in production\n' +
        '  2. Backend server is offline or sleeping on Render\n' +
        '  3. CORS: backend ALLOWED_ORIGINS does not include this frontend origin\n' +
        '  Attempted URL:', error.config?.baseURL, error.config?.url
      );
    } else if (error.response.status === 401) {
      console.warn('[BRGI API] 401 Unauthorized — token may be expired. Clearing local session.');
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
    });
    console.log('[BRGI] Socket.IO connecting to:', SOCKET_URL);
  }
  return socket;
};
