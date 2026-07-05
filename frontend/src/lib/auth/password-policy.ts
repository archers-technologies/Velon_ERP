/** Browser-safe re-export — avoids stale Vite optimizeDeps cache for @velon/shared. */
export {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  evaluatePasswordRules,
  isPasswordStrong,
  passwordStrengthMessage,
  type PasswordRuleId,
  type PasswordRuleStatus,
} from '@velon/shared';
