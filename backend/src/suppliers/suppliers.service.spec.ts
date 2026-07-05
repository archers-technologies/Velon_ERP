import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { SuppliersService } from "./suppliers.service";
import { IDS, META, tenantOwner, tenantUser } from "../test-utils/fixtures";
import { createMockAudit, createRepoMock } from "../test-utils/mocks";

describe("SuppliersService", () => {
  const suppliers = createRepoMock([
    "findMany",
    "findById",
    "findByCode",
    "create",
    "update",
  ]);
  const contacts = createRepoMock(["findBySupplier", "findById", "create", "update"]);
  const threads = createRepoMock(["findBySupplier", "create"]);
  const audit = createMockAudit();
  let service: SuppliersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SuppliersService(
      suppliers as never,
      contacts as never,
      threads as never,
      audit as never,
    );
  });

  it("denies manage for read-only users", async () => {
    await expect(
      service.createSupplier(tenantUser(), { name: "Acme Supply" }, META),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects duplicate supplier codes", async () => {
    suppliers.findByCode.mockResolvedValue({ id: "existing" });
    await expect(
      service.createSupplier(tenantOwner(), { name: "Acme", code: "SUP-1" }, META),
    ).rejects.toThrow(BadRequestException);
  });

  it("creates a supplier and audits the action", async () => {
    suppliers.findByCode.mockResolvedValue(null);
    suppliers.create.mockResolvedValue({
      id: IDS.supplier,
      code: "SUP-ABC",
      name: "Acme Supply",
    });

    const row = await service.createSupplier(
      tenantOwner(),
      { name: "  Acme Supply  ", code: "SUP-ABC" },
      META,
    );

    expect(row.name).toBe("Acme Supply");
    expect(suppliers.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme Supply", code: "SUP-ABC" }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "procurement.supplier_created" }),
    );
  });

  it("returns not found for missing supplier", async () => {
    suppliers.findById.mockResolvedValue(null);
    await expect(service.getSupplier(tenantOwner(), "missing")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("creates contacts only for existing suppliers", async () => {
    suppliers.findById.mockResolvedValue(null);
    await expect(
      service.createContact(tenantOwner(), IDS.supplier, {
        firstName: "Sam",
        lastName: "Lee",
      }),
    ).rejects.toThrow(NotFoundException);

    suppliers.findById.mockResolvedValue({ id: IDS.supplier });
    contacts.create.mockResolvedValue({ id: "contact-1", firstName: "Sam" });
    await expect(
      service.createContact(tenantOwner(), IDS.supplier, {
        firstName: "Sam",
        lastName: "Lee",
      }),
    ).resolves.toMatchObject({ firstName: "Sam" });
  });

  it("posts communication threads with author fallback to email", async () => {
    suppliers.findById.mockResolvedValue({ id: IDS.supplier });
    threads.create.mockResolvedValue({ id: "thread-1", body: "Hello" });
    const row = await service.createThread(
      tenantOwner(),
      IDS.supplier,
      { body: "  Hello  " },
      META,
    );
    expect(threads.create).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: tenantOwner().email,
        body: "Hello",
      }),
    );
    expect(row.body).toBe("Hello");
  });
});
