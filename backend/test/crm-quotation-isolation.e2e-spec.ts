import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from './helpers/tenant-seed';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('CRM quotation tenant isolation (Phase 3C)', () => {
  let app: INestApplication;
  let tokenA = '';
  let tokenB = '';
  let tenantAId = '';
  let customerAId = '';
  let quotationAId = '';
  let portalToken = '';
  let ownerPassword = '';
  const emailA = `crm-qtn-a-${Date.now()}@crm.test`;
  const emailB = `crm-qtn-b-${Date.now()}@crm.test`;

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://127.0.0.1:6379';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seededA = await seedTenantUser({ email: emailA, companyName: 'Quote Corp A' });
    tenantAId = seededA.tenant.id;
    ownerPassword = seededA.password;
    await seedTenantUser({ email: emailB, companyName: 'Quote Corp B' });

    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: emailA, password: ownerPassword });
    tokenA = (loginA.body.data ?? loginA.body).accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: emailB, password: ownerPassword });
    tokenB = (loginB.body.data ?? loginB.body).accessToken;
  });

  afterAll(async () => {
    await cleanupTenantUser(emailA);
    await cleanupTenantUser(emailB);
    await app?.close();
    await disconnectTestDb();
  });

  it('creates CRM customer and quotation', async () => {
    const cust = await request(app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ companyName: 'Buyer Inc', email: 'buyer@test.com', status: 'ACTIVE' });
    customerAId = (cust.body.data ?? cust.body).id;

    const qtn = await request(app.getHttpServer())
      .post('/api/v1/crm/quotations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ customerId: customerAId, scopeOfWork: 'Implementation services' });
    expect([200, 201]).toContain(qtn.status);
    const body = qtn.body.data ?? qtn.body;
    quotationAId = body.id;
    expect(body.tenantId).toBe(tenantAId);
    expect(body.quotationNumber).toMatch(/^QTN-\d{4}-\d{5}$/);
  });

  it('tenant B cannot read tenant A quotation', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/crm/quotations')
      .set('Authorization', `Bearer ${tokenB}`);
    const rows = list.body.data ?? list.body;
    expect(rows.find((r: { id: string }) => r.id === quotationAId)).toBeUndefined();

    const getOne = await request(app.getHttpServer())
      .get(`/api/v1/crm/quotations/${quotationAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(getOne.status).toBe(404);
  });

  it('adds item and generates proposal PDF', async () => {
    const item = await request(app.getHttpServer())
      .post('/api/v1/crm/quotation-items')
      .query({ quotationId: quotationAId })
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ itemName: 'Consulting', quantity: 10, unitPrice: 150, taxRate: 10 });
    expect([200, 201]).toContain(item.status);

    const pdf = await request(app.getHttpServer())
      .post(`/api/v1/crm/proposals/generate/${quotationAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect([200, 201]).toContain(pdf.status);
  });

  it('sends quotation and exposes customer portal', async () => {
    const sent = await request(app.getHttpServer())
      .post(`/api/v1/crm/quotations/${quotationAId}/send`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});
    expect([200, 201]).toContain(sent.status);
    portalToken = (sent.body.data ?? sent.body).portalToken;
    expect(portalToken).toBeTruthy();

    const view = await request(app.getHttpServer()).get(`/api/v1/crm/customer-view/${portalToken}`);
    expect(view.status).toBe(200);
    const body = view.body.data ?? view.body;
    expect(body.quotationNumber).toMatch(/^QTN-/);
  });

  it('customer portal token does not leak tenant B data', async () => {
    const view = await request(app.getHttpServer()).get(`/api/v1/crm/customer-view/${portalToken}`);
    const body = view.body.data ?? view.body;
    expect(body.customer.companyName).toBe('Buyer Inc');
    expect(body.total).toBeDefined();
  });

  it('customer can accept via portal without ERP login', async () => {
    const accept = await request(app.getHttpServer())
      .post(`/api/v1/crm/customer-view/${portalToken}/accept`)
      .send({ comments: 'Looks good' });
    expect([200, 201]).toContain(accept.status);
    const qtn = await request(app.getHttpServer())
      .get(`/api/v1/crm/quotations/${quotationAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect((qtn.body.data ?? qtn.body).status).toBe('APPROVED');
  });

  it('tenant B still cannot access tenant A quotation after approval', async () => {
    const getOne = await request(app.getHttpServer())
      .get(`/api/v1/crm/quotations/${quotationAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(getOne.status).toBe(404);
  });
});
