import { NotFoundException } from "@nestjs/common";
import { TenantResourcesService } from "./tenant-resources.service";
import { IDS, tenantOwner } from "../test-utils/fixtures";
import { createRepoMock } from "../test-utils/mocks";

describe("TenantResourcesService", () => {
  const customers = createRepoMock(["create", "findMany", "findById"]);
  const projects = createRepoMock(["create", "findById"]);
  const assets = createRepoMock(["create", "findMany", "findById"]);
  const files = createRepoMock(["create", "findMany", "findById"]);
  const notifications = createRepoMock(["create", "findManyForUser", "findById"]);
  const audit = createRepoMock(["findMany", "findById"]);

  const service = new TenantResourcesService(
    customers as never,
    projects as never,
    assets as never,
    files as never,
    notifications as never,
    audit as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it("creates and lists customers through repository mocks", async () => {
    customers.create.mockResolvedValue({ id: "c1", name: "Acme" });
    customers.findMany.mockResolvedValue([{ id: "c1", name: "Acme" }]);
    await expect(service.createCustomer(tenantOwner(), "Acme")).resolves.toMatchObject({
      name: "Acme",
    });
    await expect(service.listCustomers(tenantOwner())).resolves.toHaveLength(1);
  });

  it("throws not found for missing resources", async () => {
    projects.findById.mockResolvedValue(null);
    assets.findById.mockResolvedValue(null);
    files.findById.mockResolvedValue(null);
    await expect(service.getProject(tenantOwner(), "missing")).rejects.toThrow(NotFoundException);
    await expect(service.getAsset(tenantOwner(), "missing")).rejects.toThrow(NotFoundException);
    await expect(service.getFile(tenantOwner(), "missing")).rejects.toThrow(NotFoundException);
  });

  it("scopes notifications to the authenticated user", async () => {
    notifications.findById.mockResolvedValue({
      id: "n1",
      userId: "someone-else",
      title: "Hi",
    });
    await expect(service.getNotification(tenantOwner(), "n1")).rejects.toThrow(NotFoundException);

    notifications.findById.mockResolvedValue({
      id: "n1",
      userId: IDS.owner,
      title: "Hi",
    });
    await expect(service.getNotification(tenantOwner(), "n1")).resolves.toMatchObject({
      title: "Hi",
    });
  });
});
