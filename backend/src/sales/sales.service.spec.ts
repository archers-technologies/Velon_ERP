import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CrmQuotationStatus } from "@velon/database";
import { SalesService } from "./sales.service";
import { IDS, META, tenantOwner, tenantUser } from "../test-utils/fixtures";
import { createMockAudit, createMockPrisma, createMockPrismaClient, createRepoMock } from "../test-utils/mocks";

describe("SalesService", () => {
  const orders = createRepoMock(["findMany", "findById", "nextOrderNumber"]);
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);
  const audit = createMockAudit();
  let service: SalesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SalesService(orders as never, prisma, audit as never);
  });

  it("denies write for read-only users", async () => {
    await expect(
      service.createFromQuotation(tenantUser(), IDS.quotation, META),
    ).rejects.toThrow(ForbiddenException);
  });

  it("lists orders for permitted readers", async () => {
    orders.findMany.mockResolvedValue([{ id: IDS.salesOrder }]);
    await expect(service.listOrders(tenantOwner())).resolves.toHaveLength(1);
  });

  it("returns not found for missing order", async () => {
    orders.findById.mockResolvedValue(null);
    await expect(service.getOrder(tenantOwner(), "missing")).rejects.toThrow(NotFoundException);
  });

  it("converts only approved quotations without an existing sales order", async () => {
    client.crmQuotation.findFirst.mockResolvedValue({
      id: IDS.quotation,
      status: CrmQuotationStatus.DRAFT,
      salesOrderId: null,
      items: [],
    });
    await expect(
      service.createFromQuotation(tenantOwner(), IDS.quotation, META),
    ).rejects.toThrow(BadRequestException);

    client.crmQuotation.findFirst.mockResolvedValue({
      id: IDS.quotation,
      status: CrmQuotationStatus.APPROVED,
      salesOrderId: IDS.salesOrder,
      items: [],
    });
    await expect(
      service.createFromQuotation(tenantOwner(), IDS.quotation, META),
    ).rejects.toThrow(/already been converted/);
  });

  it("creates a sales order from an approved quotation", async () => {
    const year = new Date().getFullYear();
    client.crmQuotation.findFirst.mockResolvedValue({
      id: IDS.quotation,
      status: CrmQuotationStatus.APPROVED,
      salesOrderId: null,
      opportunityId: IDS.opportunity,
      customerId: IDS.customer,
      subtotal: 100,
      tax: 15,
      total: 115,
      items: [
        {
          productId: IDS.product,
          itemName: "Widget",
          description: null,
          quantity: 2,
          unitPrice: 50,
          discount: 0,
          lineTotal: 100,
          position: 0,
        },
      ],
    });
    client.workspace.findFirst.mockResolvedValue({ id: IDS.workspace });
    orders.nextOrderNumber.mockResolvedValue(`SO-${year}-0001`);
    const created = {
      id: IDS.salesOrder,
      orderNumber: `SO-${year}-0001`,
      items: [],
    };
    client.$transaction.mockImplementation(async (fn: (tx: typeof client) => Promise<unknown>) =>
      fn({
        ...client,
        salesOrder: {
          create: jest.fn().mockResolvedValue(created),
        },
        crmQuotation: {
          update: jest.fn().mockResolvedValue({}),
        },
      } as never),
    );

    const order = await service.createFromQuotation(tenantOwner(), IDS.quotation, META);
    expect(order.id).toBe(IDS.salesOrder);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "sales.order_created_from_quotation" }),
    );
  });
});
