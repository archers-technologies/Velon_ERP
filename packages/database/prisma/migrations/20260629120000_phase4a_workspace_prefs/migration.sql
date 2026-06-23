-- Phase 4A: persist workspace locale preferences per tenant
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
