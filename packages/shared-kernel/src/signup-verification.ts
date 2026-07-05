import { createHmac, timingSafeEqual } from 'node:crypto';

export type SignupVerificationPayload = {
  email: string;
  companyName: string;
  exp: number;
};

function encodePayload(payload: SignupVerificationPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encoded: string): SignupVerificationPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as SignupVerificationPayload & { businessName?: string };
    const companyName = parsed.companyName ?? parsed.businessName;
    if (
      typeof parsed.email !== 'string' ||
      typeof companyName !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    return { email: parsed.email, companyName, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function issueSignupVerificationToken(
  secret: string,
  email: string,
  companyName: string,
  ttlMs = 15 * 60 * 1000,
): string {
  const payload: SignupVerificationPayload = {
    email: email.trim().toLowerCase(),
    companyName: companyName.trim(),
    exp: Date.now() + ttlMs,
  };
  const encoded = encodePayload(payload);
  const sig = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySignupVerificationToken(
  secret: string,
  token: string,
  email: string,
  companyName: string,
): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  const payload = decodePayload(encoded);
  if (!payload) return false;
  if (payload.exp < Date.now()) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCompany = companyName.trim();
  return payload.email === normalizedEmail && payload.companyName === normalizedCompany;
}
