import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Forward /api/* to local backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Forward /socket.io/* to local backend during development
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
          'graph': ['reactflow'],
          'ui': ['lucide-react', 'framer-motion'],
          'network': ['axios', 'socket.io-client']
        }
      }
    }
  }
});
