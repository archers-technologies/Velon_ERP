import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CrmQuotationStatus } from "@velon/database";
import { CrmQuotationService } from "./crm-quotation.service";
import { IDS, META, tenantOwner, tenantUser } from "../test-utils/fixtures";
import { createMockAudit, createMockPrisma, createMockPrismaClient, createRepoMock } from "../test-utils/mocks";

describe("CrmQuotationService", () => {
  const quotations = createRepoMock([
    "findMany",
    "findById",
    "findByIdAny",
    "create",
    "update",
    "nextQuotationNumber",
    "aggregateByStatus",
  ]);
  const items = createRepoMock(["findByQuotation", "create", "update", "delete"]);
  const approvals = createRepoMock(["findByQuotation", "create"]);
  const proposals = createRepoMock(["findByQuotation", "findById", "create"]);
  const templates = createRepoMock(["findMany", "findById", "create", "update", "delete"]);
  const customers = createRepoMock(["findById"]);
  const opportunities = createRepoMock(["findById"]);
  const pdf = { generate: jest.fn() };
  const audit = createMockAudit();
  const prisma = createMockPrisma(createMockPrismaClient());

  let service: CrmQuotationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CrmQuotationService(
      quotations as never,
      items as never,
      approvals as never,
      proposals as never,
      templates as never,
      customers as never,
      opportunities as never,
      pdf as never,
      audit as never,
      prisma,
    );
  });

  it("denies write for read-only users", async () => {
    await expect(
      service.createQuotation(tenantUser(), { customerId: IDS.customer }, META),
    ).rejects.toThrow(ForbiddenException);
  });

  it("requires an existing customer", async () => {
    customers.findById.mockResolvedValue(null);
    await expect(
      service.createQuotation(tenantOwner(), { customerId: "missing" }, META),
    ).rejects.toThrow(BadRequestException);
  });

  it("creates a draft quotation with a generated number", async () => {
    const year = new Date().getFullYear();
    customers.findById.mockResolvedValue({ id: IDS.customer });
    quotations.nextQuotationNumber.mockResolvedValue(`Q-${year}-0001`);
    quotations.create.mockResolvedValue({
      id: IDS.quotation,
      quotationNumber: `Q-${year}-0001`,
      status: CrmQuotationStatus.DRAFT,
    });

    const row = await service.createQuotation(
      tenantOwner(),
      { customerId: IDS.customer },
      META,
    );

    expect(row.quotationNumber).toBe(`Q-${year}-0001`);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quotation_created" }),
    );
  });

  it("returns not found for missing quotations", async () => {
    quotations.findById.mockResolvedValue(null);
    await expect(service.getQuotation(tenantOwner(), "missing")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("computes quotation metrics from status aggregates", async () => {
    quotations.aggregateByStatus.mockResolvedValue([
      { status: CrmQuotationStatus.APPROVED, _count: 2, _sum: { total: 200 } },
      { status: CrmQuotationStatus.REJECTED, _count: 2, _sum: { total: 50 } },
      { status: CrmQuotationStatus.SENT, _count: 1, _sum: { total: 30 } },
    ]);

    const metrics = await service.getQuotationMetrics(tenantOwner());
    expect(metrics.totalQuotations).toBe(5);
    expect(metrics.approvedQuotations).toBe(2);
    expect(metrics.rejectedQuotations).toBe(2);
    expect(metrics.pendingQuotations).toBe(1);
    expect(metrics.conversionRate).toBe(50);
    expect(metrics.wonRevenue).toBe(200);
  });
});
