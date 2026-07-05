export type SignupVerificationPayload = {
    email: string;
    companyName: string;
    exp: number;
};
export declare function issueSignupVerificationToken(secret: string, email: string, companyName: string, ttlMs?: number): string;
export declare function verifySignupVerificationToken(secret: string, token: string, email: string, companyName: string): boolean;
