'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PASSWORD_RULES = exports.PASSWORD_MIN_LENGTH = void 0;
exports.evaluatePasswordRules = evaluatePasswordRules;
exports.isPasswordStrong = isPasswordStrong;
exports.passwordStrengthMessage = passwordStrengthMessage;
exports.PASSWORD_MIN_LENGTH = 8;
exports.PASSWORD_RULES = [
  { id: 'minLength', label: 'Minimum 8 characters' },
  { id: 'uppercase', label: 'Uppercase letter' },
  { id: 'lowercase', label: 'Lowercase letter' },
  { id: 'number', label: 'Number' },
  { id: 'symbol', label: 'Symbol' },
];
function evaluatePasswordRules(password) {
  return {
    minLength: password.length >= exports.PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}
function isPasswordStrong(password) {
  const rules = evaluatePasswordRules(password);
  return exports.PASSWORD_RULES.every((rule) => rules[rule.id]);
}
function passwordStrengthMessage(password) {
  const rules = evaluatePasswordRules(password);
  if (!rules.minLength) {
    return `Password must be at least ${exports.PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!rules.uppercase) return 'Password must include at least one uppercase letter.';
  if (!rules.lowercase) return 'Password must include at least one lowercase letter.';
  if (!rules.number) return 'Password must include at least one number.';
  if (!rules.symbol) return 'Password must include at least one symbol.';
  if (password.trim().length > 128) return 'Password is too long.';
  return null;
}
//# sourceMappingURL=password-policy.js.map
