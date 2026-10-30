import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.min.js',
      '.github/**',
      '.specify/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    // Principles VIII and X: the room domain never reaches into games, transport, or HTTP.
    files: ['apps/server/src/rooms/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/games/**', '**/realtime/**', '**/http/**'], message: 'The rooms module must not depend on games, realtime, or http code.' },
        { group: ['fastify', 'ws', 'pino', '@fastify/*'], message: 'The rooms module is framework independent.' },
      ] }],
    },
  },
  {
    files: ['packages/**/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/apps/**', '**/tools/**', '@myarena/server', '@myarena/web', '@myarena/load'], message: 'Shared packages must not depend on applications.' },
      ] }],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/apps/server/**', '@myarena/server', '@myarena/game-sdk'], message: 'The web app must not import server or game code.' },
      ] }],
    },
  },
  prettier,
);
