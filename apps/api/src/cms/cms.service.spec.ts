import { CmsService } from "./cms.service";
import { createMockPrisma, createMockPrismaClient } from "../test-utils/mocks";

describe("CmsService", () => {
  const client = createMockPrismaClient();
  const service = new CmsService(createMockPrisma(client));

  beforeEach(() => jest.clearAllMocks());

  it("fills missing site content blocks with defaults", async () => {
    client.siteContentBlock.findMany.mockResolvedValue([
      { key: "hero", data: { title: "Custom hero" } },
    ]);

    const all = await service.getAll();
    expect(all.hero).toEqual({ title: "Custom hero" });
    expect(all).toHaveProperty("pricing");
  });

  it("returns default block when key is missing", async () => {
    client.siteContentBlock.findUnique.mockResolvedValue(null);
    const block = await service.getBlock("hero" as never);
    expect(block).toBeDefined();
  });

  it("upserts a content block through prisma mock", async () => {
    client.siteContentBlock.upsert.mockResolvedValue({
      key: "hero",
      data: { title: "Updated" },
    });
    await service.upsertBlock("hero" as never, { title: "Updated" });
    expect(client.siteContentBlock.upsert).toHaveBeenCalledWith({
      where: { key: "hero" },
      create: { key: "hero", data: { title: "Updated" } },
      update: { data: { title: "Updated" } },
    });
  });
});
