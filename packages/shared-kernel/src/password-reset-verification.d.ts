export type PasswordResetVerificationPayload = {
    email: string;
    exp: number;
};
export declare function issuePasswordResetVerificationToken(secret: string, email: string, ttlMs?: number): string;
export declare function verifyPasswordResetVerificationToken(secret: string, token: string, email: string): boolean;
