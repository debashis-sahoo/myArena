import { describe, expect, it } from 'vitest';
import { INVITATION_ALPHABET, createInvitation, generateInvitationCode } from '../../src/rooms/invitation.js';

describe('invitation codes', () => {
  it('uses 10 characters from the 32-character unambiguous alphabet', () => {
    expect(INVITATION_ALPHABET).toHaveLength(32);
    expect(new Set(INVITATION_ALPHABET).size).toBe(32);
    expect(INVITATION_ALPHABET).not.toMatch(/[IO01]/);
    for (let index = 0; index < 500; index++) expect(generateInvitationCode()).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
  });

  it('does not repeat across 10,000 samples', () => {
    const codes = new Set(Array.from({ length: 10_000 }, generateInvitationCode));
    expect(codes.size).toBe(10_000);
  });

  it('creates active invitations', () => {
    expect(createInvitation(5)).toEqual({ code: expect.stringMatching(/^[A-HJ-NP-Z2-9]{10}$/), status: 'ACTIVE', createdAt: 5 });
  });
});
