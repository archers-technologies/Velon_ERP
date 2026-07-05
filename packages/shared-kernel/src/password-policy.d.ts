export declare const PASSWORD_MIN_LENGTH = 8;
export type PasswordRuleId = 'minLength' | 'uppercase' | 'lowercase' | 'number' | 'symbol';
export declare const PASSWORD_RULES: {
    id: PasswordRuleId;
    label: string;
}[];
export type PasswordRuleStatus = Record<PasswordRuleId, boolean>;
export declare function evaluatePasswordRules(password: string): PasswordRuleStatus;
export declare function isPasswordStrong(password: string): boolean;
export declare function passwordStrengthMessage(password: string): string | null;
