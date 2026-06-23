import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { getRedisUrl } from "../config/env";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    const isTest = process.env.NODE_ENV === "test";
    this.client = new Redis(getRedisUrl(), {
      enableOfflineQueue: isTest,
      enableReadyCheck: true,
      maxRetriesPerRequest: isTest ? 5 : 1,
      connectTimeout: isTest ? 10_000 : 5_000,
      retryStrategy: (times) => Math.min(times * 50, 2_000),
    });
    this.client.on("error", () => {
      // Health checks expose Redis state; request handlers should degrade gracefully.
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async getRevision(): Promise<number> {
    try {
      const v = await this.client.get("velon:platform:revision");
      return v ? Number(v) : 0;
    } catch {
      return 0;
    }
  }

  async bumpRevision(): Promise<number> {
    try {
      return await this.client.incr("velon:platform:revision");
    } catch {
      return 0;
    }
  }

  async publish(channel: string, payload: string) {
    try {
      await this.client.publish(channel, payload);
    } catch {
      // Realtime notifications are best-effort when Redis is unavailable locally.
    }
  }
}
