import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { createMockPrisma, createMockPrismaClient, createMockRedis } from "../../test/helpers/mocks";

describe("HealthController", () => {
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);
  const redis = createMockRedis();
  const controller = new HealthController(prisma, redis as never);

  beforeEach(() => jest.clearAllMocks());

  it("returns ok for liveness without touching dependencies", () => {
    const live = controller.live();
    expect(live.status).toBe("ok");
    expect(live.service).toBe("velon-api");
    expect(client.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns ok for basic health check", () => {
    expect(controller.check()).toEqual({
      status: "ok",
      service: "Velon ERP API",
    });
  });

  it("reports ready when postgres and redis mocks are up", async () => {
    const result = await controller.ready();
    expect(result.status).toBe("ok");
    expect(result.services).toMatchObject({ postgres: "up", redis: "up" });
  });

  it("throws degraded when postgres is down", async () => {
    client.$queryRaw.mockRejectedValue(new Error("connection refused"));
    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
  });
});
