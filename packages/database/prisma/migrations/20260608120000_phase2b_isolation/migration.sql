-- Phase 2B: role semantics — enum values must commit before use (separate migration).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TENANT_OWNER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER';
