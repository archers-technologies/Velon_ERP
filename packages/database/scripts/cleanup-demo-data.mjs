#!/usr/bin/env node
/**
 * Remove demo/e2e tenants and platform test users from the database.
 * Only touches rows with seedSource = demo | e2e — never seedSource = null (real tenants).
 *
 * Usage:
 *   node packages/database/scripts/cleanup-demo-data.mjs [--dry-run]
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function main() {
  const demoUsers = await prisma.user.findMany({
    where: { seedSource: { in: ['demo', 'e2e'] } },
    select: { id: true, email: true, seedSource: true },
  });

  const demoTenants = await prisma.tenant.findMany({
    where: { seedSource: { in: ['demo', 'e2e'] } },
    select: { id: true, name: true, tenantCode: true, seedSource: true },
  });

  console.log(
    `Found ${demoTenants.length} demo/e2e tenant(s) and ${demoUsers.length} demo/e2e user(s) (seedSource only).`,
  );
  if (dryRun) {
    for (const t of demoTenants)
      console.log(`  tenant: ${t.tenantCode} · ${t.name} · ${t.seedSource}`);
    for (const u of demoUsers) console.log(`  user: ${u.email} · ${u.seedSource}`);
    console.log('Dry run — no records deleted.');
    return;
  }

  for (const tenant of demoTenants) {
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log(`Deleted tenant ${tenant.tenantCode} (${tenant.name})`);
  }

  for (const user of demoUsers) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`Deleted user ${user.email}`);
  }

  console.log('Cleanup complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
