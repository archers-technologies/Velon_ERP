import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IDS, tenantOwner, tenantUser } from '../../test/helpers/fixtures';
import { createMockPrisma, createMockPrismaClient, createRepoMock } from '../../test/helpers/mocks';
import { InventoryVariantsService } from './inventory-variants.service';

describe('InventoryVariantsService', () => {
  const products = createRepoMock(['findById', 'findBySku', 'update']);
  const variants = createRepoMock([
    'findByProduct',
    'findById',
    'findBySku',
    'findByBarcode',
    'search',
    'countByProduct',
  ]);
  const attributes = createRepoMock(['findByProduct']);
  const stock = createRepoMock();
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);

  let service: InventoryVariantsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryVariantsService(
      products as never,
      variants as never,
      attributes as never,
      stock as never,
      prisma,
    );
  });

  it('denies variant save for read-only users', async () => {
    await expect(
      service.saveVariantsForProduct(tenantUser(), IDS.product, true, [], []),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects empty attributes when variants enabled', async () => {
    products.findById.mockResolvedValue({ id: IDS.product });
    await expect(
      service.saveVariantsForProduct(tenantOwner(), IDS.product, true, [], []),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate attribute names when variants enabled', async () => {
    products.findById.mockResolvedValue({ id: IDS.product });
    await expect(
      service.saveVariantsForProduct(
        tenantOwner(),
        IDS.product,
        true,
        [
          { name: 'Color', values: ['Black'] },
          { name: 'Color', values: ['Red'] },
        ],
        [{ sku: 'SKU-A', optionValues: [{ attributeName: 'Color', value: 'Black' }] }],
      ),
    ).rejects.toThrow(/Duplicate attribute name/);
  });

  it('rejects duplicate SKU in variant batch', async () => {
    products.findById.mockResolvedValue({ id: IDS.product });
    variants.findBySku.mockResolvedValue(null);
    products.findBySku.mockResolvedValue(null);
    client.inventoryProduct.findFirst.mockResolvedValue(null);

    await expect(
      service.saveVariantsForProduct(
        tenantOwner(),
        IDS.product,
        true,
        [{ name: 'Color', values: ['Black'] }],
        [
          { sku: 'SKU-A', optionValues: [{ attributeName: 'Color', value: 'Black' }] },
          { sku: 'SKU-A', optionValues: [{ attributeName: 'Color', value: 'Black' }] },
        ],
      ),
    ).rejects.toThrow(/Duplicate SKU/);
  });

  it('returns not found for missing product', async () => {
    products.findById.mockResolvedValue(null);
    await expect(service.listVariantsForProduct(tenantOwner(), 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
