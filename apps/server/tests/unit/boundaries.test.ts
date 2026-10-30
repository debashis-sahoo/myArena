import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const importsOf = (source: string) => [...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((match) => match[1]!);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

export function violations(files: string[], forbidden: RegExp) {
  return files.flatMap((file) => importsOf(readFileSync(file, 'utf8')).filter((specifier) => forbidden.test(specifier)).map((specifier) => `${relative(root, file)} imports ${specifier}`));
}

describe('module boundaries (Principles VIII and X)', () => {
  it('keeps the room module free of game implementations, transport, and HTTP code', () => {
    const files = sourceFiles(join(root, 'apps/server/src/rooms'));
    expect(files.length).toBeGreaterThan(5);
    expect(violations(files, /(^|\/)(games|realtime|http)(\/|$)|^(fastify|ws|pino)$|^@fastify\//)).toEqual([]);
  });

  it('keeps the game SDK and the protocol independent of the applications', () => {
    for (const name of ['game-sdk', 'protocol']) {
      const files = sourceFiles(join(root, `packages/${name}/src`));
      expect(files.length).toBeGreaterThan(0);
      expect(violations(files, /(^|\/)(apps|tools)\/|^@myarena\/(server|web|load)$/)).toEqual([]);
    }
  });

  it('keeps the game SDK free of platform dependencies', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'packages/game-sdk/package.json'), 'utf8'));
    expect(Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })).not.toEqual(expect.arrayContaining(['@myarena/server']));
    expect(violations(sourceFiles(join(root, 'packages/game-sdk/src')), /^@myarena\//)).toEqual([]);
  });

  it('keeps the web app from importing server code', () => {
    expect(violations(sourceFiles(join(root, 'apps/web/src')), /(^|\/)apps\/server\/|^@myarena\/(server|game-sdk)$/)).toEqual([]);
  });

  it('would notice a forbidden import', () => {
    const sample = ["import { x } from '../games/stub-game.js';", "import type { y } from '../../realtime/gateway.js';", "import fine from './participant.js';"].join('\n');
    const found = importsOf(sample).filter((specifier) => /(^|\/)(games|realtime|http)(\/|$)/.test(specifier));
    expect(found).toEqual(['../games/stub-game.js', '../../realtime/gateway.js']);
  });
});
