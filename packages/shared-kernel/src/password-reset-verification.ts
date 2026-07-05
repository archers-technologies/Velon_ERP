import { createHmac, timingSafeEqual } from "node:crypto";

export type PasswordResetVerificationPayload = {
  email: string;
  exp: number;
};

function encodePayload(payload: PasswordResetVerificationPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): PasswordResetVerificationPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as PasswordResetVerificationPayload;
    if (typeof parsed.email !== "string" || typeof parsed.exp !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function issuePasswordResetVerificationToken(
  secret: string,
  email: string,
  ttlMs = 15 * 60 * 1000,
): string {
  const payload: PasswordResetVerificationPayload = {
    email: email.trim().toLowerCase(),
    exp: Date.now() + ttlMs,
  };
  const encoded = encodePayload(payload);
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyPasswordResetVerificationToken(
  secret: string,
  token: string,
  email: string,
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  const payload = decodePayload(encoded);
  if (!payload) return false;
  if (payload.exp < Date.now()) return false;
  return payload.email === email.trim().toLowerCase();
}
