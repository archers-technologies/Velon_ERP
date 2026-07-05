import { createHash } from 'node:crypto';
import { isPasswordStrong, PASSWORD_MIN_LENGTH, passwordStrengthMessage } from '@velon/shared';

export { PASSWORD_MIN_LENGTH };

const COMMON_WEAK = new Set(
  [
    'password',
    'password123',
    '12345678901234',
    'qwertyuiopasdf',
    'letmeinletmein',
    'welcome1234567',
    'adminadminadmin',
  ].map((s) => s.toLowerCase()),
);

export type PasswordValidationResult = { ok: true } | { ok: false; message: string };

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const value = password.trim();
  const complexityMessage = passwordStrengthMessage(value);
  if (complexityMessage) {
    return { ok: false, message: complexityMessage };
  }
  if (COMMON_WEAK.has(value.toLowerCase())) {
    return { ok: false, message: 'Choose a less common password.' };
  }
  return { ok: true };
}

function sha1Hex(value: string): string {
  return createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
}

/** Have I Been Pwned k-anonymity range check. Fails open if the API is unreachable. */
export async function isPasswordBreached(password: string): Promise<boolean> {
  const hash = sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split('\n').some((line) => {
      const [hashSuffix] = line.split(':');
      return hashSuffix?.trim().toUpperCase() === suffix;
    });
  } catch {
    return false;
  }
}

export async function assertPasswordAllowed(password: string): Promise<void> {
  const strength = validatePasswordStrength(password);
  if (!strength.ok) throw new Error(strength.message);
  if (await isPasswordBreached(password)) {
    throw new Error('This password appears in known data breaches. Choose a different password.');
  }
}
