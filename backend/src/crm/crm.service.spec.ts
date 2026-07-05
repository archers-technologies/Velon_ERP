import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CrmCustomerStatus } from "@velon/database";
import { CrmService } from "./crm.service";
import { IDS, META, tenantOwner, tenantUser } from "../test-utils/fixtures";
import { createMockAudit, createRepoMock } from "../test-utils/mocks";

describe("CrmService", () => {
  const customers = createRepoMock([
    "findMany",
    "findById",
    "findByIdAny",
    "create",
    "update",
  ]);
  const contacts = createRepoMock();
  const notes = createRepoMock();
  const activities = createRepoMock();
  const audit = createMockAudit();

  let service: CrmService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CrmService(
      customers as never,
      contacts as never,
      notes as never,
      activities as never,
      audit as never,
    );
  });

  describe("customers", () => {
    it("denies CRM write for read-only users", async () => {
      await expect(
        service.createCustomer(tenantUser(), { companyName: "Acme" }, META),
      ).rejects.toThrow(ForbiddenException);
    });

    it("creates a customer and marks it not archived", async () => {
      customers.create.mockResolvedValue({
        id: IDS.customer,
        companyName: "Acme Corp",
        archivedAt: null,
        status: CrmCustomerStatus.PROSPECT,
      });

      const row = await service.createCustomer(
        tenantOwner(),
        { companyName: "  Acme Corp  ", email: "Sales@Acme.TEST" },
        META,
      );

      expect(customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Acme Corp",
          email: "sales@acme.test",
          createdById: tenantOwner().id,
        }),
      );
      expect(row.isArchived).toBe(false);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "crm.customer_created" }),
      );
    });

    it("returns not found for missing customer", async () => {
      customers.findById.mockResolvedValue(null);
      await expect(service.getCustomer(tenantOwner(), "missing")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("archives an active customer", async () => {
      customers.findByIdAny.mockResolvedValue({ id: IDS.customer, archivedAt: null });
      customers.update.mockResolvedValue({});
      await expect(service.archiveCustomer(tenantOwner(), IDS.customer, META)).resolves.toEqual({
        ok: true,
      });
      expect(customers.update).toHaveBeenCalledWith(
        IDS.customer,
        expect.objectContaining({
          status: CrmCustomerStatus.INACTIVE,
          archivedAt: expect.any(Date),
        }),
      );
    });

    it("rejects double archive", async () => {
      customers.findByIdAny.mockResolvedValue({
        id: IDS.customer,
        archivedAt: new Date(),
      });
      await expect(service.archiveCustomer(tenantOwner(), IDS.customer, META)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
