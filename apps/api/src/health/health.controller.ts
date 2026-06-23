import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    return this.ready();
  }

  @Get("live")
  live() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "velon-api",
    };
  }

  @Get("ready")
  async ready() {
    const services: Record<string, "up" | "down"> = { postgres: "down", redis: "down" };
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      services.postgres = "up";
    } catch {
      services.postgres = "down";
    }

    try {
      await this.redis.client.ping();
      services.redis = "up";
    } catch {
      services.redis = "down";
    }

    if (services.postgres !== "up" || services.redis !== "up") {
      throw new ServiceUnavailableException({
        status: "degraded",
        timestamp: new Date().toISOString(),
        services,
      });
    }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
