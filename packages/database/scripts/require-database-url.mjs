#!/usr/bin/env node
/**
 * Fail fast before `prisma migrate deploy` when DATABASE_URL is missing or unresolved.
 * Railway pre-deploy runs without a linked Postgres service if variables are not wired.
 */
const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.error('ERROR: DATABASE_URL is not set.');
  console.error('');
  console.error('Railway setup (API service will not deploy until this is fixed):');
  console.error('  1. In the same project: + New → Database → PostgreSQL');
  console.error('  2. Open the API service → Variables');
  console.error('  3. Add: DATABASE_URL=${{Postgres.DATABASE_URL}}');
  console.error("     (use the exact Postgres service name if it is not 'Postgres')");
  console.error('  4. Redeploy the API service');
  console.error('');
  console.error('See docs/HOSTING.md');
  process.exit(1);
}

if (url.includes('${{') || url.includes('{{Postgres')) {
  console.error(
    'ERROR: DATABASE_URL is unresolved — Railway could not substitute the Postgres reference.',
  );
  console.error('');
  console.error(`Current value: ${url}`);
  console.error('');
  console.error('Fix:');
  console.error(
    '  1. Add a PostgreSQL database to this Railway project (+ New → Database → PostgreSQL)',
  );
  console.error(
    '  2. On the API service, set DATABASE_URL to ${{<YourPostgresServiceName>.DATABASE_URL}}',
  );
  console.error('     or paste the connection string from the Postgres service → Connect tab');
  console.error('  3. Redeploy');
  console.error('');
  console.error('See docs/HOSTING.md');
  process.exit(1);
}

try {
  const parsed = new URL(url);
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(`expected postgresql:// or postgres://, got ${parsed.protocol}`);
  }
  if (!parsed.hostname) {
    throw new Error('missing hostname');
  }
} catch (err) {
  console.error('ERROR: DATABASE_URL is not a valid PostgreSQL connection string.');
  console.error(err instanceof Error ? err.message : String(err));
  console.error('');
  console.error('Use the DATABASE_URL from Railway Postgres → Connect, or:');
  console.error('  DATABASE_URL=${{Postgres.DATABASE_URL}}');
  process.exit(1);
}
