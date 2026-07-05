import { PASSWORD_MIN_LENGTH, validatePasswordStrength } from './password-policy.util';

describe('password-policy.util', () => {
  it('requires at least 8 characters with complexity', () => {
    expect(validatePasswordStrength('short')).toEqual({
      ok: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    });
    expect(validatePasswordStrength('abcdefgh')).toEqual({
      ok: false,
      message: 'Password must include at least one uppercase letter.',
    });
    expect(validatePasswordStrength('Abcdef1!')).toEqual({ ok: true });
  });
});
