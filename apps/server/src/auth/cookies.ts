import type { FastifyReply } from 'fastify';

export const memberCookieName = (roomId: string): string => `mah_m_${roomId}`;
export const memberCookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' } as const;
export function setMemberCookie(reply: FastifyReply, roomId: string, token: string): void {
  reply.setCookie(memberCookieName(roomId), token, memberCookieOptions);
}
export function clearMemberCookie(reply: FastifyReply, roomId: string): void {
  reply.clearCookie(memberCookieName(roomId), memberCookieOptions);
}