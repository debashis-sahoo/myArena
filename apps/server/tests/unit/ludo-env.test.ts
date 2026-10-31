import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const base = { ALLOWED_ORIGINS: 'https://arena.example' };

describe('LUDO_TEST_DICE', () => {
  it('is off by default', () => {
    expect(parseEnv({ NODE_ENV: 'test' }).ludoTestDice).toBeNull();
  });

  it('accepts a comma-separated list of die values in development and test', () => {
    expect(parseEnv({ NODE_ENV: 'test', LUDO_TEST_DICE: '6, 6,3,4' }).ludoTestDice).toEqual([6, 6, 3, 4]);
    expect(parseEnv({ NODE_ENV: 'development', LUDO_TEST_DICE: '1' }).ludoTestDice).toEqual([1]);
  });

  it('rejects values that are not die faces', () => {
    for (const value of ['0', '7', '6,,3', 'six', '1.5', '']) {
      expect(() => parseEnv({ NODE_ENV: 'test', LUDO_TEST_DICE: value })).toThrow(/LUDO_TEST_DICE/);
    }
  });

  it('is refused in production, even on a preview deployment', () => {
    expect(() => parseEnv({ ...base, NODE_ENV: 'production', LUDO_TEST_DICE: '6' })).toThrow(/not allowed in production/);
    expect(() => parseEnv({ ...base, NODE_ENV: 'production', DEPLOY_TARGET: 'preview', LUDO_TEST_DICE: '6' })).toThrow(/not allowed in production/);
    expect(parseEnv({ ...base, NODE_ENV: 'production' }).ludoTestDice).toBeNull();
  });
});
