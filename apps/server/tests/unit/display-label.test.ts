import { describe, expect, it } from 'vitest';
import { displayNameSchema } from '@myarena/protocol';
import { disambiguateLabel } from '../../src/rooms/display-label.js';

describe('display labels', () => {
  it('keeps a unique name unchanged', () => {
    expect(disambiguateLabel('Sam', ['Alex'])).toBe('Sam');
  });

  it('numbers duplicates, ignoring case', () => {
    expect(disambiguateLabel('Sam', ['Sam'])).toBe('Sam (2)');
    expect(disambiguateLabel('Sam', ['Sam', 'Sam (2)'])).toBe('Sam (3)');
    expect(disambiguateLabel('Sam', ['sam'])).toBe('Sam (2)');
  });

  it('skips a numbered label that is already taken', () => {
    expect(disambiguateLabel('Sam', ['Sam', 'Sam (3)'])).toBe('Sam (2)');
  });

  it('validates names before they become labels', () => {
    expect(displayNameSchema.safeParse('Sam (2)').success).toBe(false);
    expect(displayNameSchema.safeParse('Sam').success).toBe(true);
  });
});
