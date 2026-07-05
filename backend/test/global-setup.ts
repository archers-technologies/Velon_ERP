import Redis from "ioredis";

/** Ensure Redis is reachable before any e2e suite boots Nest (avoids flaky OTP 503). */
export default async function globalSetup() {
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  const client = new Redis(url, {
    enableOfflineQueue: true,
    maxRetriesPerRequest: 5,
    connectTimeout: 10_000,
  });

  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if ((await client.ping()) === "PONG") {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  await client.quit();
  if (!ready) {
    throw new Error(`Redis not reachable at ${url} — start docker compose redis before e2e tests.`);
  }
}
