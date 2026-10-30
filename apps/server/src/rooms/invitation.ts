import { randomInt } from 'node:crypto';

export const INVITATION_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITATION_LENGTH = 10;

export interface Invitation { code: string; status: 'ACTIVE' | 'REVOKED'; createdAt: number; }

export function generateInvitationCode(): string {
  let code = '';
  for (let index = 0; index < INVITATION_LENGTH; index++) code += INVITATION_ALPHABET[randomInt(INVITATION_ALPHABET.length)];
  return code;
}

export const createInvitation = (now: number, code = generateInvitationCode()): Invitation => ({ code, status: 'ACTIVE', createdAt: now });

export const inviteLink = (code: string): string => `/join/${code}`;

export const normalizeInvitationCode = (input: string): string => input.trim().toUpperCase().replace(/[\s-]/g, '');
