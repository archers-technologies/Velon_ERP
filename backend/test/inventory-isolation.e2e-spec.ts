import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from './helpers/tenant-seed';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Inventory & procurement tenant isolation (Phase 5A)', () => {
  let app: INestApplication;
  let tokenA = '';
  let tokenB = '';
  let productAId = '';
  let stockAId = '';
  let supplierAId = '';
  let requestAId = '';
  let orderAId = '';
  let warehouseAId = '';
  let ownerPassword = '';
  const emailA = `inv-a-${Date.now()}@inv.test`;
  const emailB = `inv-b-${Date.now()}@inv.test`;

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://127.0.0.1:6379';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seededA = await seedTenantUser({ email: emailA, companyName: 'Inventory Corp A' });
    ownerPassword = seededA.password;
    await seedTenantUser({ email: emailB, companyName: 'Inventory Corp B' });

    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: emailA, password: ownerPassword });
    tokenA = (loginA.body.data ?? loginA.body).accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: emailB, password: ownerPassword });
    tokenB = (loginB.body.data ?? loginB.body).accessToken;

    const productRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Widget A', site: 'Main WH', quantity: 10, reorderPoint: 5, safetyStock: 2 });
    productAId = (productRes.body.data ?? productRes.body).id;

    const stockRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/stock')
      .set('Authorization', `Bearer ${tokenA}`);
    const stocks = stockRes.body.data ?? stockRes.body;
    stockAId = stocks[0]?.id;

    const whRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/warehouses')
      .set('Authorization', `Bearer ${tokenA}`);
    const warehouses = whRes.body.data ?? whRes.body;
    warehouseAId = warehouses.find((w: { name: string }) => w.name === 'Main WH')?.id ?? '';

    const supplierRes = await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Acme Supplies' });
    supplierAId = (supplierRes.body.data ?? supplierRes.body).id;

    const prRes = await request(app.getHttpServer())
      .post('/api/v1/procurement/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ items: [{ description: 'Office chairs', quantity: 4 }] });
    requestAId = (prRes.body.data ?? prRes.body).id;

    const poRes = await request(app.getHttpServer())
      .post('/api/v1/procurement/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        supplierId: supplierAId,
        items: [{ description: 'Chairs', quantity: 4, unitPrice: 120 }],
      });
    orderAId = (poRes.body.data ?? poRes.body).id;
  });

  afterAll(async () => {
    await cleanupTenantUser(emailA);
    await cleanupTenantUser(emailB);
    await app.close();
    await disconnectTestDb();
  });

  it('tenant B cannot read tenant A product by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory/products/${productAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('tenant B cannot adjust tenant A stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/stock/adjust')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ productId: productAId, warehouseId: 'fake', delta: -5 });
    expect([400, 404]).toContain(res.status);
  });

  it('tenant B stock list excludes tenant A rows', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory/stock')
      .set('Authorization', `Bearer ${tokenB}`);
    const rows = res.body.data ?? res.body;
    expect(rows.find((r: { id: string }) => r.id === stockAId)).toBeUndefined();
  });

  it('tenant B cannot read tenant A supplier', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/suppliers/${supplierAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('tenant B cannot read tenant A purchase request', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/procurement/requests/${requestAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('tenant B cannot read tenant A purchase order', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/procurement/orders/${orderAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('creates audit log for product creation', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/workspace/dashboard')
      .set('Authorization', `Bearer ${tokenA}`);
    const activity = (res.body.data ?? res.body).recentActivity as { action: string }[];
    expect(activity.some((a) => a.action === 'inventory.product_created')).toBe(true);
  });

  it('receiving an approved PO with productId increases warehouse stock', async () => {
    expect(warehouseAId).toBeTruthy();

    const productRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory/products/${productAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    const product = productRes.body.data ?? productRes.body;

    const stockBeforeRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/stock')
      .set('Authorization', `Bearer ${tokenA}`);
    const stocksBefore = stockBeforeRes.body.data ?? stockBeforeRes.body;
    const row = stocksBefore.find(
      (r: { sku: string; site: string }) => r.sku === product.sku && r.site === 'Main WH',
    );
    expect(row).toBeDefined();
    const qtyBefore = row.quantity as number;
    const warehouseId = warehouseAId;

    const poRes = await request(app.getHttpServer())
      .post('/api/v1/procurement/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        supplierId: supplierAId,
        items: [
          { description: 'Widget restock', quantity: 5, unitPrice: 25, productId: productAId },
        ],
      });
    expect(poRes.status).toBe(201);
    const po = poRes.body.data ?? poRes.body;
    const orderItemId = po.items[0].id as string;

    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/procurement/orders/${po.id}/approve`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});
    expect(approveRes.status).toBe(201);

    const receiveRes = await request(app.getHttpServer())
      .post(`/api/v1/procurement/orders/${po.id}/receive`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        warehouseId,
        lines: [{ orderItemId, quantity: 5 }],
      });
    expect(receiveRes.status).toBe(201);
    const received = receiveRes.body.data ?? receiveRes.body;
    expect(received.status).toBe('RECEIVED');
    expect(received.items[0].receivedQty).toBe(5);

    const stockAfterRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/stock')
      .set('Authorization', `Bearer ${tokenA}`);
    const stocksAfter = stockAfterRes.body.data ?? stockAfterRes.body;
    const after = stocksAfter.find(
      (r: { sku: string; site: string }) => r.sku === product.sku && r.site === 'Main WH',
    );
    expect(after.quantity).toBe(qtyBefore + 5);
  });
});
