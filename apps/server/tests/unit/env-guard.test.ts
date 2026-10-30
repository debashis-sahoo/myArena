import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const production = { NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://myarena.example' };

describe('test-game environment guard', () => {
  it('refuses the test game in production without the preview target', () => {
    expect(() => parseEnv({ ...production, TEST_GAME_SECONDS: '5' })).toThrow(/DEPLOY_TARGET=preview/);
    expect(() => parseEnv({ ...production, TEST_GAME_SECONDS: '5', DEPLOY_TARGET: 'production' })).toThrow();
  });

  it('allows the test game in production when the target is preview', () => {
    expect(parseEnv({ ...production, TEST_GAME_SECONDS: '5', DEPLOY_TARGET: 'preview' })).toMatchObject({ testGameSeconds: 5, deployTarget: 'preview' });
  });

  it('does not affect development or test, and defaults to production', () => {
    expect(parseEnv({ NODE_ENV: 'development', TEST_GAME_SECONDS: '5' }).testGameSeconds).toBe(5);
    expect(parseEnv({ NODE_ENV: 'test', TEST_GAME_SECONDS: '5' }).testGameSeconds).toBe(5);
    expect(parseEnv({}).deployTarget).toBe('production');
  });

  it('rejects an unknown deploy target', () => {
    expect(() => parseEnv({ DEPLOY_TARGET: 'staging' })).toThrow();
  });
});
