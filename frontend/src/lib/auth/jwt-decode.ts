import type { AuthScope, JwtPayload } from '@velon/shared';

const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_SUPPORT']);

/** Decode JWT payload for client-side portal routing only — NOT for authorization. */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function readTokenScope(token: string | null): AuthScope | null {
  if (!token) return null;
  if (token.startsWith('demo-access-')) return token.includes('admin') ? 'platform' : 'tenant';
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  if (payload.scope) return payload.scope;
  if (payload.role && PLATFORM_ROLES.has(String(payload.role))) return 'platform';
  return 'tenant';
}
