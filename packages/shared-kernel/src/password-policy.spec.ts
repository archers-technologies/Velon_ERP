import {
  evaluatePasswordRules,
  isPasswordStrong,
  PASSWORD_MIN_LENGTH,
  passwordStrengthMessage,
} from './password-policy';

describe('password-policy', () => {
  it('requires minimum 8 characters', () => {
    expect(evaluatePasswordRules('Ab1!').minLength).toBe(false);
    expect(evaluatePasswordRules('Abcdef1!').minLength).toBe(true);
    expect(passwordStrengthMessage('Ab1!')).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  });

  it('requires uppercase, lowercase, number, and symbol', () => {
    expect(isPasswordStrong('abcdef1!')).toBe(false);
    expect(isPasswordStrong('ABCDEF1!')).toBe(false);
    expect(isPasswordStrong('Abcdefgh!')).toBe(false);
    expect(isPasswordStrong('Abcdefg1')).toBe(false);
    expect(isPasswordStrong('Abcdef1!')).toBe(true);
  });
});
