import { AuditService } from "./audit.service";
import { IDS } from "../test-utils/fixtures";
import { createMockPrisma, createMockPrismaClient } from "../test-utils/mocks";

describe("AuditService", () => {
  const client = createMockPrismaClient();
  const service = new AuditService(createMockPrisma(client));

  beforeEach(() => jest.clearAllMocks());

  it("persists a generic audit entry via prisma mock", async () => {
    client.auditLog.create.mockResolvedValue({ id: "a1" });
    await service.log({
      actorId: IDS.user,
      tenantId: IDS.tenant,
      action: "inventory.product_created",
      entityType: "inventory_product",
      entityId: IDS.product,
    });
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "inventory.product_created",
        tenantId: IDS.tenant,
      }),
    });
  });

  it("records login with auth.login action", async () => {
    client.auditLog.create.mockResolvedValue({ id: "a1" });
    await service.logLogin({ actorId: IDS.user, tenantId: IDS.tenant });
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "auth.login",
        entityType: "user",
        entityId: IDS.user,
      }),
    });
  });

  it("lists recent logs scoped to tenant when provided", async () => {
    client.auditLog.findMany.mockResolvedValue([]);
    await service.listRecent(10, IDS.tenant);
    expect(client.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: IDS.tenant },
        take: 10,
      }),
    );
  });
});
