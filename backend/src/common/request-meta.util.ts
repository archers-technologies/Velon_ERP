import type { Request } from 'express';

const SECURITY_LOGIN_WARNING =
  "If this wasn't you, please reset your password or contact support immediately.";

export type RequestMeta = {
  ip?: string;
  ua?: string;
};

export function extractRequestMeta(req: Request): RequestMeta {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.split(',')[0]?.trim()
        : undefined;

  return {
    ip: forwardedIp || req.ip || req.socket?.remoteAddress || undefined,
    ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}

export function formatDeviceFromUserAgent(ua?: string): string {
  if (!ua?.trim()) return 'Unknown device';
  const value = ua.trim();
  if (value.length <= 120) return value;
  return `${value.slice(0, 117)}...`;
}

export function formatLoginTime(date = new Date()): string {
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, ' UTC');
}

export function securityLoginWarningText(): string {
  return SECURITY_LOGIN_WARNING;
}
