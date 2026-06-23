-- Optional TOTP secret for MFA-enrolled users (password reset verification).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;
