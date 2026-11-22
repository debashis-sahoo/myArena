import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const sharedSrc = fileURLToPath(new URL('../shared/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@myarena/shared': sharedSrc },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '^/host$': {
        target: 'http://localhost:10000',
        changeOrigin: false,
        configure(proxy) {
          proxy.on('proxyReq', (request) => request.setHeader('X-MyArena-Vite-Host', '1'));
        },
      },
      '/socket.io': { target: 'http://localhost:10000', ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
});
