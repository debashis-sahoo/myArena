import { gzipSync } from 'node:zlib';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';
import { checkBudget } from './build/budget';

// Fails the build when the entry and lobby routes outgrow 200 KB gzipped or pull in Babylon.js.
function bundleBudget(): Plugin {
  return {
    name: 'bundle-budget',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).flatMap((output) => (output.type === 'chunk' ? [{
        name: output.fileName, gzipBytes: gzipSync(output.code).length, modules: Object.keys(output.modules), lazy: output.isDynamicEntry && !output.isEntry,
      }] : []));
      const result = checkBudget(chunks);
      if (!result.ok) this.error(result.problems.join(' '));
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
