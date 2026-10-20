import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, Vite renvoie /api et /uploads vers le serveur Node (port 4000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000'
    }
  }
});
