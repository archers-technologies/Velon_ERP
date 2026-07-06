'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.issueSignupVerificationToken = issueSignupVerificationToken;
exports.verifySignupVerificationToken = verifySignupVerificationToken;
const node_crypto_1 = require('node:crypto');
function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}
function decodePayload(encoded) {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
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
function issueSignupVerificationToken(secret, email, companyName, ttlMs = 15 * 60 * 1000) {
  const payload = {
    email: email.trim().toLowerCase(),
    companyName: companyName.trim(),
    exp: Date.now() + ttlMs,
  };
  const encoded = encodePayload(payload);
  const sig = (0, node_crypto_1.createHmac)('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}
function verifySignupVerificationToken(secret, token, email, companyName) {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  const expected = (0, node_crypto_1.createHmac)('sha256', secret)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !(0, node_crypto_1.timingSafeEqual)(sigBuf, expectedBuf)
  ) {
    return false;
  }
  const payload = decodePayload(encoded);
  if (!payload) return false;
  if (payload.exp < Date.now()) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCompany = companyName.trim();
  return payload.email === normalizedEmail && payload.companyName === normalizedCompany;
}
//# sourceMappingURL=signup-verification.js.map
