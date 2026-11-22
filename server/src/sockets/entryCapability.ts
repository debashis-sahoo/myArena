import crypto from 'node:crypto';

export const HOST_ENTRY_COOKIE = 'myarena_host_entry';
const MAX_AGE_SECONDS = 12 * 60 * 60;

interface CapabilityPayload {
  v: 1;
  role: 'host';
  issuedAt: number;
  expiresAt: number;
}

export interface HostEntryCapability {
  cookie(secure: boolean): string;
  validFromCookieHeader(cookieHeader: string | undefined): boolean;
}

function encode(value: CapabilityPayload): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decode(encoded: string): CapabilityPayload | null {
  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<CapabilityPayload>;
    if (
      value.v !== 1 ||
      value.role !== 'host' ||
      typeof value.issuedAt !== 'number' ||
      typeof value.expiresAt !== 'number'
    ) {
      return null;
    }
    return value as CapabilityPayload;
  } catch {
    return null;
  }
}

function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(';')) {
    const item = part.trim();
    if (item.startsWith(prefix)) return item.slice(prefix.length);
  }
  return undefined;
}

export function createHostEntryCapability(): HostEntryCapability {
  const secret = crypto.randomBytes(32);

  const sign = (payload: string): string =>
    crypto.createHmac('sha256', secret).update(payload).digest('base64url');

  return {
    cookie(secure: boolean): string {
      const issuedAt = Date.now();
      const payload = encode({
        v: 1,
        role: 'host',
        issuedAt,
        expiresAt: issuedAt + MAX_AGE_SECONDS * 1000,
      });
      const token = `${payload}.${sign(payload)}`;
      return `${HOST_ENTRY_COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${
        secure ? '; Secure' : ''
      }`;
    },

    validFromCookieHeader(cookieHeader: string | undefined): boolean {
      const token = readCookie(cookieHeader, HOST_ENTRY_COOKIE);
      if (!token) return false;
      const parts = token.split('.');
      if (parts.length !== 2) return false;
      const [payload, signature] = parts;
      if (!payload || !signature) return false;
      const expected = Buffer.from(sign(payload));
      const actual = Buffer.from(signature);
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;

      const value = decode(payload);
      if (!value) return false;
      const now = Date.now();
      return value.issuedAt <= now && value.expiresAt >= now && value.expiresAt - value.issuedAt <= MAX_AGE_SECONDS * 1000;
    },
  };
}
