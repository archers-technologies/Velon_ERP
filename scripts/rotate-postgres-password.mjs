#!/usr/bin/env node
/**
 * Rotate the PostgreSQL role password used in DATABASE_URL and update .env.
 *
 * Local / Docker / self-managed Postgres only.
 * Railway managed Postgres: use the dashboard or `railway connect` — see docs/HOSTING.md.
 *
 * Usage:
 *   node scripts/rotate-postgres-password.mjs 'MyNewSecurePassword!'
 *   npm run db:rotate-password -- 'MyNewSecurePassword!'
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function parsePgUrl(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)(\?.*)?$/);
  if (!match) {
    throw new Error("DATABASE_URL must look like postgresql://user:pass@host:port/db?schema=public");
  }
  const [, user, passwordEnc, host, port, database, search = "?schema=public"] = match;
  return {
    user: decodeURIComponent(user),
    password: decodeURIComponent(passwordEnc),
    host,
    port: port || "5432",
    database,
    search,
  };
}

function buildPgUrl({ user, password, host, port, database, search }) {
  const userEnc = encodeURIComponent(user);
  const passEnc = encodeURIComponent(password);
  return `postgresql://${userEnc}:${passEnc}@${host}:${port}/${database}${search}`;
}

function loadDatabaseUrl() {
  if (!existsSync(envPath)) {
    throw new Error(".env not found. Copy .env.example to .env first.");
  }
  const text = readFileSync(envPath, "utf8");
  const line = text.split("\n").find((l) => /^DATABASE_URL=/.test(l) && !l.trimStart().startsWith("#"));
  if (!line) throw new Error("DATABASE_URL is not set in .env");
  const value = line.slice("DATABASE_URL=".length).trim();
  return { text, databaseUrl: value.replace(/^["']|["']$/g, "") };
}

function replaceDatabaseUrl(text, nextUrl) {
  let replaced = false;
  const lines = text.split("\n").map((line) => {
    if (!replaced && /^DATABASE_URL=/.test(line) && !line.trimStart().startsWith("#")) {
      replaced = true;
      return `DATABASE_URL=${nextUrl}`;
    }
    return line;
  });
  if (!replaced) lines.push(`DATABASE_URL=${nextUrl}`);
  return lines.join("\n");
}

const newPassword = process.argv[2];
if (!newPassword || newPassword.length < 12) {
  console.error("Usage: npm run db:rotate-password -- '<new-password>'");
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const { text, databaseUrl } = loadDatabaseUrl();
const pg = parsePgUrl(databaseUrl);

const alterSql = `ALTER USER "${pg.user.replace(/"/g, '""')}" WITH PASSWORD '${newPassword.replace(/'/g, "''")}';`;

const psql = spawnSync(
  "psql",
  [
    "-h",
    pg.host,
    "-p",
    pg.port,
    "-U",
    pg.user,
    "-d",
    pg.database,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    alterSql,
  ],
  {
    env: { ...process.env, PGPASSWORD: pg.password },
    encoding: "utf8",
  },
);

if (psql.status !== 0) {
  console.error(psql.stderr || psql.stdout || "psql failed");
  console.error("\nIf psql is missing, install PostgreSQL client tools.");
  console.error("For Railway hosted Postgres, see docs/HOSTING.md (section: Rotate database password).");
  process.exit(psql.status || 1);
}

const nextUrl = buildPgUrl({ ...pg, password: newPassword });
writeFileSync(envPath, replaceDatabaseUrl(text, nextUrl), "utf8");

console.log(`Password updated for role "${pg.user}" on ${pg.host}:${pg.port}/${pg.database}`);
console.log(".env DATABASE_URL has been updated.");
console.log("\nIf you use Docker Compose, also update POSTGRES_PASSWORD in docker-compose.yml to match.");
console.log("If the API runs on Railway, update DATABASE_URL in the Railway API service variables.");
