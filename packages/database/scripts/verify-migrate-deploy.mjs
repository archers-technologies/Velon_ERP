#!/usr/bin/env node
/**
 * Verifies prisma migrate deploy on an empty database (Phase 1 → 5B).
 *
 * Strategy A: throwaway database (requires CREATEDB).
 * Strategy B: isolated schema on the existing database (no CREATEDB needed).
 */
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dirname, "../../../.env");
config({ path: rootEnv });

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

const parsed = new URL(baseUrl);
const verifyDb = "velon_erp_migrate_verify";
const verifySchema = "migrate_verify";

const env = { ...process.env, PGPASSWORD: parsed.password };
const prismaDir = resolve(__dirname, "..");

function pgUrl(dbName, schema) {
  const u = new URL(baseUrl);
  u.pathname = `/${dbName}`;
  u.search = schema ? `schema=${schema}` : "";
  return u.toString();
}

function psql(url, sql, opts = {}) {
  return execSync(`psql "${url}" -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql)}`, {
    stdio: opts.inherit ? "inherit" : "pipe",
    env,
  });
}

function psqlQuery(url, sql) {
  return execSync(`psql "${url}" -t -c ${JSON.stringify(sql)}`, { env })
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const required = [
  "Tenant",
  "User",
  "CrmCustomer",
  "CrmQuotation",
  "InventoryProduct",
  "InventoryCategory",
  "InventoryWarehouse",
  "InventoryStock",
  "Supplier",
  "PurchaseRequest",
  "PurchaseOrder",
  "PurchaseOrderItem",
  "SalesOrder",
  "SalesOrderItem",
  "SalesOrderNumberSequence",
];

function runMigrateDeploy(databaseUrl, inspectUrl, tableSchema) {
  console.log("→ Running prisma migrate deploy…");
  execSync("npx prisma migrate deploy", {
    cwd: prismaDir,
    stdio: "inherit",
    env: { ...env, DATABASE_URL: databaseUrl },
  });

  const tables = psqlQuery(
    inspectUrl,
    `SELECT tablename FROM pg_tables WHERE schemaname='${tableSchema}' ORDER BY tablename;`,
  );

  const missing = required.filter((t) => !tables.includes(t));
  if (missing.length) {
    console.error("✗ migrate deploy succeeded but tables are missing:", missing.join(", "));
    process.exit(1);
  }

  console.log(
    `✓ migrate deploy verified — ${tables.length} tables in ${tableSchema}, all required tables present.`,
  );
}

let mode = "database";
const adminUrl = pgUrl("postgres", "");

try {
  console.log("→ Strategy A: empty throwaway database…");
  try {
    psql(adminUrl, `DROP DATABASE IF EXISTS ${verifyDb} WITH (FORCE);`);
  } catch {
    psql(adminUrl, `DROP DATABASE IF EXISTS ${verifyDb};`);
  }
  psql(adminUrl, `CREATE DATABASE ${verifyDb};`);

  const deployUrl = pgUrl(verifyDb, "public");
  const inspectUrl = pgUrl(verifyDb, "");
  runMigrateDeploy(deployUrl, inspectUrl, "public");

  console.log("→ Cleaning up verify database…");
  try {
    psql(adminUrl, `DROP DATABASE ${verifyDb} WITH (FORCE);`);
  } catch {
    psql(adminUrl, `DROP DATABASE ${verifyDb};`);
  }
} catch (err) {
  const denied =
    String(err.stderr ?? err.message ?? "").includes("permission denied") ||
    String(err.stderr ?? err.message ?? "").includes("CREATEDB");
  if (!denied) {
    console.error(err.stderr?.toString() ?? err.message);
    process.exit(1);
  }

  mode = "schema";
  console.log("→ Strategy A unavailable (no CREATEDB). Using Strategy B: isolated schema…");

  const dbName = parsed.pathname.replace(/^\//, "") || "velon_erp";
  const baseInspect = pgUrl(dbName, "");
  psql(baseInspect, `DROP SCHEMA IF EXISTS ${verifySchema} CASCADE;`);
  psql(baseInspect, `CREATE SCHEMA ${verifySchema};`);

  const deployUrl = pgUrl(dbName, verifySchema);
  runMigrateDeploy(deployUrl, baseInspect, verifySchema);

  console.log(`→ Cleaning up ${verifySchema} schema…`);
  psql(baseInspect, `DROP SCHEMA IF EXISTS ${verifySchema} CASCADE;`);
}

console.log(`✓ Fresh-environment migration verification complete (${mode}).`);
