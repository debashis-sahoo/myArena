import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = new URL('../../../../', import.meta.url);
const json = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

describe('workspace setup', () => {
  it('uses the planned runtime and private workspaces', () => {
    expect(process.versions.node.split('.')[0]).toBe('24');
    expect(json('package.json')).toMatchObject({
      private: true,
      workspaces: ['apps/*', 'packages/*', 'tools/*'],
    });
    expect(json('tsconfig.base.json').compilerOptions.strict).toBe(true);
  });

  it('provides every quickstart command', () => {
    expect(Object.keys(json('package.json').scripts)).toEqual(
      expect.arrayContaining(['dev', 'build', 'start', 'test', 'test:integration', 'test:contract', 'test:e2e', 'load']),
    );
  });

  it('keeps both shared packages independent of the applications', () => {
    for (const name of ['protocol', 'game-sdk']) {
      const dependencies = json(`packages/${name}/package.json`).dependencies ?? {};
      expect(Object.keys(dependencies)).not.toContain('@myarena/server');
      expect(Object.keys(dependencies)).not.toContain('@myarena/web');
    }
  });

  it('declares all required browser families', () => {
    const targets = json('apps/web/package.json').browserslist;
    for (const family of ['Chrome', 'Edge', 'Firefox', 'Safari', 'ChromeAndroid', 'iOS']) {
      expect(targets).toContain(`last 2 ${family} major versions`);
    }
  });

  it('configures a single paid Render service with no environment values', () => {
    const blueprint = parse(readFileSync(new URL('render.yaml', root), 'utf8'));
    expect(blueprint.services).toHaveLength(1);
    expect(blueprint.services[0]).toMatchObject({
      plan: 'starter', numInstances: 1, healthCheckPath: '/healthz',
      buildCommand: 'npm ci && npm run build', startCommand: 'npm start',
    });
    expect(blueprint.services[0].envVars).toEqual([
      { key: 'PORT', sync: false }, { key: 'NODE_ENV', sync: false },
      { key: 'ALLOWED_ORIGINS', sync: false },
      { key: 'DEPLOY_TARGET', sync: false }, { key: 'TEST_GAME_SECONDS', sync: false },
    ]);
  });

  it('ignores secrets and generated artifacts', () => {
    const ignores = readFileSync(new URL('.gitignore', root), 'utf8').split(/\r?\n/);
    for (const pattern of ['.env*', 'node_modules/', 'dist/', 'build/', 'coverage/']) {
      expect(ignores).toContain(pattern);
    }
  });
});