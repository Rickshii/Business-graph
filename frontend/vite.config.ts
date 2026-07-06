import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
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
