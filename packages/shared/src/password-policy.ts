export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = "minLength" | "uppercase" | "lowercase" | "number" | "symbol";

export const PASSWORD_RULES: { id: PasswordRuleId; label: string }[] = [
  { id: "minLength", label: "Minimum 8 characters" },
  { id: "uppercase", label: "Uppercase letter" },
  { id: "lowercase", label: "Lowercase letter" },
  { id: "number", label: "Number" },
  { id: "symbol", label: "Symbol" },
];

export type PasswordRuleStatus = Record<PasswordRuleId, boolean>;

export function evaluatePasswordRules(password: string): PasswordRuleStatus {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordStrong(password: string): boolean {
  const rules = evaluatePasswordRules(password);
  return PASSWORD_RULES.every((rule) => rules[rule.id]);
}

export function passwordStrengthMessage(password: string): string | null {
  const rules = evaluatePasswordRules(password);
  if (!rules.minLength) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!rules.uppercase) return "Password must include at least one uppercase letter.";
  if (!rules.lowercase) return "Password must include at least one lowercase letter.";
  if (!rules.number) return "Password must include at least one number.";
  if (!rules.symbol) return "Password must include at least one symbol.";
  if (password.trim().length > 128) return "Password is too long.";
  return null;
}
