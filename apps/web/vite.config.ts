import { gzipSync } from 'node:zlib';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';
import { checkBudget, checkTileImages } from './build/budget';

// Fails the build when the initial routes outgrow 200 KB gzipped, when a 3D engine is in an initial chunk,
// when the Ludo lazy chunks outgrow 400 KB gzipped, or when a game tile picture outgrows 100 KB.
function bundleBudget(): Plugin {
  return {
    name: 'bundle-budget',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).flatMap((output) => (output.type === 'chunk' ? [{
        name: output.fileName, gzipBytes: gzipSync(output.code).length, modules: Object.keys(output.modules), lazy: output.isDynamicEntry && !output.isEntry,
      }] : []));
      const result = checkBudget(chunks);
      const pictures = Object.values(bundle).flatMap((output) => (output.type === 'asset'
        ? [{ fileName: output.fileName, bytes: typeof output.source === 'string' ? Buffer.byteLength(output.source) : output.source.byteLength }]
        : []));
      const oversized = checkTileImages(pictures);
      if (!result.ok || oversized.length > 0) this.error([...result.problems, ...oversized].join(' '));
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), bundleBudget()],
  // A shell with NODE_ENV=test would otherwise bundle React's development build and development JSX calls.
  ...(command === 'build' ? { define: { 'process.env.NODE_ENV': JSON.stringify('production') }, esbuild: { jsxDev: false } } : {}),
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true },
    },
  },
  test: {
    environment: 'jsdom', globals: true, setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'], restoreMocks: true,
  },
}));
