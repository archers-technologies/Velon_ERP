#!/usr/bin/env node

const port = Number(process.env.API_PORT || process.env.PORT || 3001);
const url = `http://127.0.0.1:${port}/api/v1/health/live`;
const timeoutMs = 120_000;
const intervalMs = 250;
const startedAt = Date.now();

async function isApiLive() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  process.stdout.write(`Waiting for API at ${url}`);

  while (Date.now() - startedAt < timeoutMs) {
    if (await isApiLive()) {
      console.log(' — ready');
      return;
    }

    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.error(`\nTimed out after ${timeoutMs / 1000}s waiting for API on port ${port}`);
  process.exit(1);
}

await main();
