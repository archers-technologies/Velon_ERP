#!/usr/bin/env node
/**
 * Release readiness infrastructure verification.
 * Run: node scripts/verify-release-readiness.mjs
 * Requires DATABASE_URL and REDIS_URL in environment (or .env).
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createConnection } from "net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i);
    const val = t.slice(i + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function probePort(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.setTimeout(3000);
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function parseDbUrl(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port || 5432), user: u.username, database: u.pathname.slice(1).split("?")[0] };
  } catch {
    return null;
  }
}

function parseRedisUrl(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port || 6379) };
  } catch {
    return { host: "127.0.0.1", port: 6379 };
  }
}

async function verifyPostgres() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    record("PostgreSQL connection", false, "DATABASE_URL not set");
    return false;
  }
  const cfg = parseDbUrl(url);
  if (!cfg) {
    record("PostgreSQL connection", false, "Invalid DATABASE_URL");
    return false;
  }
  const open = await probePort(cfg.host, cfg.port);
  if (!open) {
    record("PostgreSQL port", false, `${cfg.host}:${cfg.port} unreachable`);
    return false;
  }
  record("PostgreSQL port", true, `${cfg.host}:${cfg.port} open`);

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    record("PostgreSQL auth + query", true, `database=${cfg.database}`);
    return true;
  } catch (err) {
    record("PostgreSQL auth + query", false, err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function verifyRedis() {
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  const cfg = parseRedisUrl(url);
  const open = await probePort(cfg.host, cfg.port);
  if (!open) {
    record("Redis connection", false, `${cfg.host}:${cfg.port} unreachable — OTP signup requires Redis`);
    return false;
  }
  try {
    const { execSync } = await import("child_process");
    const pong = execSync("redis-cli ping", { encoding: "utf8" }).trim();
    record("Redis connection", pong === "PONG", url);
    return pong === "PONG";
  } catch (err) {
    record("Redis connection", false, err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function verifyMigrations() {
  if (!process.env.DATABASE_URL) {
    record("Prisma migrations", false, "DATABASE_URL not set — copy .env.example to .env");
    return false;
  }
  try {
    const { execSync } = await import("child_process");
    const out = execSync("npx prisma migrate status", {
      cwd: resolve(root, "packages/database"),
      env: process.env,
      encoding: "utf8",
    });
    const pending = out.includes("following migration") && out.includes("not yet been applied");
    record(
      "Prisma migrations",
      !pending,
      pending ? "Run: npm run db:migrate:deploy" : "Schema up to date",
    );
    if (pending) {
      console.log("\n  → Apply pending migrations: npm run db:migrate:deploy\n");
    }
    return !pending;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record("Prisma migrations", false, `${msg.split("\n")[0]} — try: npm run db:migrate:deploy`);
    return false;
  }
}

async function verifyEntityCreation() {
  if (!process.env.DATABASE_URL) {
    record("Entity creation (tenant/user/workspace)", false, "DATABASE_URL not set");
    return false;
  }
  const tag = `release-verify-${Date.now()}`;
  try {
    const { PrismaClient, UserRole, IndustryTemplate } = await import("@prisma/client");
    const bcrypt = await import("bcrypt");
    const prisma = new PrismaClient();
    const passwordHash = await bcrypt.hash("VerifyPass123!", 10);
    const renewal = new Date();
    renewal.setDate(renewal.getDate() + 30);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: `${tag}@verify.test`, passwordHash, name: "Verify User", role: UserRole.USER },
      });
      const tenant = await tx.tenant.create({
        data: {
          name: `Verify Corp ${tag}`,
          slug: `${tag}`,
          tenantCode: `TNT-${tag.slice(-6).toUpperCase()}`,
          country: "India",
          industryTemplate: IndustryTemplate.SERVICES,
          renewalDate: renewal,
        },
      });
      await tx.companyProfile.create({
        data: { tenantId: tenant.id, legalName: `Verify Corp ${tag}`, email: user.email, phone: "", country: "India", industry: IndustryTemplate.SERVICES },
      });
      const workspace = await tx.workspace.create({
        data: { tenantId: tenant.id, name: `Verify WS ${tag}`, slug: `${tag}-ws` },
      });
      const membership = await tx.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "TENANT_OWNER", isActive: true },
      });
      return { userId: user.id, tenantId: tenant.id, workspaceId: workspace.id, membershipId: membership.id };
    });

    await prisma.tenantMembership.deleteMany({ where: { tenantId: created.tenantId } });
    await prisma.workspace.deleteMany({ where: { tenantId: created.tenantId } });
    await prisma.companyProfile.deleteMany({ where: { tenantId: created.tenantId } });
    await prisma.tenant.delete({ where: { id: created.tenantId } });
    await prisma.user.delete({ where: { id: created.userId } });
    await prisma.$disconnect();

    record("Entity creation (tenant/user/workspace)", true, `rolled back test entities`);
    return true;
  } catch (err) {
    record("Entity creation (tenant/user/workspace)", false, err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function main() {
  console.log("VELON ERP — Release Readiness Infrastructure Check\n");
  await verifyPostgres();
  await verifyRedis();
  await verifyMigrations();
  await verifyEntityCreation();

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${results.length} total`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
