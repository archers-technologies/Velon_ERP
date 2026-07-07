import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PurchaseOrderStatus, PurchaseRequestStatus } from '@velon/database';
import { IDS, META, tenantOwner, tenantUser } from '../../test/helpers/fixtures';
import {
  createMockAudit,
  createMockPrisma,
  createMockPrismaClient,
  createRepoMock,
} from '../../test/helpers/mocks';
import { ProcurementService } from './procurement.service';

describe('ProcurementService', () => {
  const requests = createRepoMock(['findMany', 'findById', 'update']);
  const orders = createRepoMock(['findMany', 'findById', 'update']);
  const audit = createMockAudit();
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);
  const batches = { addBatch: jest.fn() };
  let service: ProcurementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProcurementService(
      requests as never,
      orders as never,
      audit as never,
      prisma,
      batches as never,
    );
  });

  it('denies manage actions for read-only users', async () => {
    await expect(
      service.createRequest(tenantUser(), { items: [{ description: 'Paper', quantity: 1 }] }, META),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires at least one line item on create', async () => {
    await expect(service.createRequest(tenantOwner(), { items: [] }, META)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates a draft purchase request with generated number', async () => {
    const year = new Date().getFullYear();
    client.purchaseRequest.count.mockResolvedValue(0);
    client.purchaseRequest.create.mockResolvedValue({
      id: IDS.purchaseRequest,
      requestNumber: `PR-${year}-0001`,
      status: PurchaseRequestStatus.DRAFT,
    });

    const row = await service.createRequest(
      tenantOwner(),
      { items: [{ description: 'Paper', quantity: 10 }], notes: 'office' },
      META,
    );

    expect(row.requestNumber).toBe(`PR-${year}-0001`);
    expect(client.purchaseRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PurchaseRequestStatus.DRAFT,
          requestNumber: `PR-${year}-0001`,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'procurement.request_created' }),
    );
  });

  it('submits only draft requests', async () => {
    requests.findById.mockResolvedValue({
      id: IDS.purchaseRequest,
      status: PurchaseRequestStatus.APPROVED,
    });
    await expect(service.submitRequest(tenantOwner(), IDS.purchaseRequest, META)).rejects.toThrow(
      BadRequestException,
    );

    requests.findById.mockResolvedValue({
      id: IDS.purchaseRequest,
      status: PurchaseRequestStatus.DRAFT,
    });
    requests.update.mockResolvedValue({
      status: PurchaseRequestStatus.PENDING_APPROVAL,
    });
    await expect(
      service.submitRequest(tenantOwner(), IDS.purchaseRequest, META),
    ).resolves.toMatchObject({ status: PurchaseRequestStatus.PENDING_APPROVAL });
  });

  it('approves pending requests and rejects non-pending', async () => {
    requests.findById.mockResolvedValue({
      id: IDS.purchaseRequest,
      status: PurchaseRequestStatus.DRAFT,
    });
    await expect(
      service.approveRequest(tenantOwner(), IDS.purchaseRequest, {}, META),
    ).rejects.toThrow(BadRequestException);

    requests.findById.mockResolvedValue({
      id: IDS.purchaseRequest,
      status: PurchaseRequestStatus.PENDING_APPROVAL,
    });
    requests.update.mockResolvedValue({ status: PurchaseRequestStatus.APPROVED });
    await expect(
      service.approveRequest(tenantOwner(), IDS.purchaseRequest, { comments: 'ok' }, META),
    ).resolves.toMatchObject({ status: PurchaseRequestStatus.APPROVED });
  });

  it('creates a purchase order only for known suppliers', async () => {
    client.supplier.findFirst.mockResolvedValue(null);
    await expect(
      service.createOrder(
        tenantOwner(),
        {
          supplierId: IDS.supplier,
          items: [{ description: 'Ink', quantity: 2, unitPrice: 5 }],
        },
        META,
      ),
    ).rejects.toThrow(NotFoundException);

    client.supplier.findFirst.mockResolvedValue({ id: IDS.supplier });
    client.purchaseOrder.count.mockResolvedValue(0);
    const year = new Date().getFullYear();
    client.purchaseOrder.create.mockResolvedValue({
      id: IDS.purchaseOrder,
      poNumber: `PO-${year}-0001`,
      total: 10,
    });

    const po = await service.createOrder(
      tenantOwner(),
      {
        supplierId: IDS.supplier,
        items: [{ description: 'Ink', quantity: 2, unitPrice: 5 }],
      },
      META,
    );
    expect(po.poNumber).toBe(`PO-${year}-0001`);
  });

  it('sends only approved purchase orders', async () => {
    orders.findById.mockResolvedValue({
      id: IDS.purchaseOrder,
      status: PurchaseOrderStatus.DRAFT,
    });
    await expect(service.submitOrder(tenantOwner(), IDS.purchaseOrder)).rejects.toThrow(
      BadRequestException,
    );

    orders.findById.mockResolvedValue({
      id: IDS.purchaseOrder,
      status: PurchaseOrderStatus.APPROVED,
    });
    orders.update.mockResolvedValue({ status: PurchaseOrderStatus.SENT });
    await expect(service.submitOrder(tenantOwner(), IDS.purchaseOrder)).resolves.toMatchObject({
      status: PurchaseOrderStatus.SENT,
    });
  });
});
