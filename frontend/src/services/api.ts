import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('brgi_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Singleton Socket Connection
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true
    });
    console.log('Socket.IO Connection initialized.');
  }
  return socket;
};
