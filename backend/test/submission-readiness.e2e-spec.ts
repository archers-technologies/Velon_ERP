import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { generateInviteToken, hashInviteToken } from '../src/tenant-admin/tenant-admin.utils';
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from './helpers/tenant-seed';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Submission readiness — departments, re-enable, quotation revisions', () => {
  let app: INestApplication;
  let ownerToken = '';
  let memberToken = '';
  let memberMembershipId = '';
  let tenantAId = '';
  let tenantBToken = '';
  let departmentId = '';
  let quotationRootId = '';
  let quotationLatestId = '';
  let portalToken = '';
  const tag = Date.now();
  const ownerEmail = `submit-owner-${tag}@readiness.test`;
  const memberEmail = `submit-member-${tag}@readiness.test`;
  const tenantBEmail = `submit-b-${tag}@readiness.test`;
  const memberPassword = 'SubmitMember123!';

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://127.0.0.1:6379';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seeded = await seedTenantUser({ email: ownerEmail, companyName: `Submit Corp ${tag}` });
    tenantAId = seeded.tenant.id;
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: seeded.password });
    ownerToken = (login.body.data ?? login.body).accessToken;

    await seedTenantUser({ email: tenantBEmail, companyName: `Submit B ${tag}` });
    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: tenantBEmail, password: seeded.password });
    tenantBToken = (loginB.body.data ?? loginB.body).accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/tenant-admin/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fullName: 'Dept Member', email: memberEmail, role: 'USER' });

    const { PrismaClient } = await import('@velon/database');
    const prisma = new PrismaClient();
    const inv = await prisma.tenantInvitation.findFirst({
      where: { tenantId: tenantAId, email: memberEmail },
      orderBy: { createdAt: 'desc' },
    });
    const token = generateInviteToken();
    await prisma.tenantInvitation.update({
      where: { id: inv!.id },
      data: { tokenHash: hashInviteToken(token) },
    });
    await prisma.$disconnect();

    await request(app.getHttpServer())
      .post('/api/v1/invitations/accept')
      .send({ token, password: memberPassword });

    const memberLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: memberPassword });
    memberToken = (memberLogin.body.data ?? memberLogin.body).accessToken;

    const members = await request(app.getHttpServer())
      .get('/api/v1/tenant-admin/members')
      .set('Authorization', `Bearer ${ownerToken}`);
    const member = (members.body.data ?? members.body).find(
      (m: { email: string }) => m.email === memberEmail,
    );
    memberMembershipId = member.id;
  });

  afterAll(async () => {
    await cleanupTenantUser(ownerEmail);
    await cleanupTenantUser(memberEmail);
    await cleanupTenantUser(tenantBEmail);
    await app?.close();
    await disconnectTestDb();
  });

  describe('Department management', () => {
    it('creates department with audit trail', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant-admin/departments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Operations', description: 'Store ops' });
      expect([200, 201]).toContain(res.status);
      departmentId = (res.body.data ?? res.body).id;
      expect(departmentId).toBeTruthy();

      const overview = await request(app.getHttpServer())
        .get('/api/v1/tenant-admin/overview')
        .set('Authorization', `Bearer ${ownerToken}`);
      const logs = (overview.body.data ?? overview.body).auditLogs as { action: string }[];
      expect(logs.some((l) => l.action === 'tenant.department_created')).toBe(true);
    });

    it('edits department', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tenant-admin/departments/${departmentId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Operations — revised', description: 'Updated scope' });
      expect(res.status).toBe(200);
      expect((res.body.data ?? res.body).name).toBe('Operations — revised');
    });

    it('assigns member to department', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tenant-admin/members/${memberMembershipId}/department`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ departmentId });
      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.departmentId).toBe(departmentId);
      expect(body.departmentName).toBeTruthy();
    });

    it('removes member from department', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tenant-admin/members/${memberMembershipId}/department`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ departmentId: null });
      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.departmentId).toBeNull();
      expect(body.departmentName).toBeNull();
    });

    it('member cannot create departments (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant-admin/departments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Unauthorized dept' });
      expect(res.status).toBe(403);
    });

    it('tenant B cannot read tenant A department', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant-admin/departments')
        .set('Authorization', `Bearer ${tenantBToken}`);
      const rows = res.body.data ?? res.body;
      if (res.status === 200 && Array.isArray(rows)) {
        expect(rows.find((d: { id: string }) => d.id === departmentId)).toBeUndefined();
      } else {
        expect(res.status).toBe(403);
      }
    });

    it('deletes department (disable equivalent)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tenant-admin/departments/${departmentId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);

      const list = await request(app.getHttpServer())
        .get('/api/v1/tenant-admin/departments')
        .set('Authorization', `Bearer ${ownerToken}`);
      const rows = list.body.data ?? list.body;
      expect(rows.find((d: { id: string }) => d.id === departmentId)).toBeUndefined();
    });

    it('recreates department (re-enable equivalent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant-admin/departments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Operations restored' });
      expect([200, 201]).toContain(res.status);
      departmentId = (res.body.data ?? res.body).id;
      expect(departmentId).toBeTruthy();
    });
  });

  describe('Member re-enable lifecycle', () => {
    it('disables member — login fails', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tenant-admin/members/${memberMembershipId}/disable`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: memberEmail, password: memberPassword });
      expect(login.status).toBe(401);
    });

    it('re-enables member — login succeeds with JWT', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tenant-admin/members/${memberMembershipId}/enable`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: memberEmail, password: memberPassword });
      expect(login.status).toBe(201);
      const body = login.body.data ?? login.body;
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
      expect(body.scope).toBe('tenant');

      const overview = await request(app.getHttpServer())
        .get('/api/v1/tenant-admin/overview')
        .set('Authorization', `Bearer ${ownerToken}`);
      const logs = (overview.body.data ?? overview.body).auditLogs as { action: string }[];
      expect(logs.some((l) => l.action === 'tenant.user_enabled')).toBe(true);
    });
  });

  describe('Quotation revision workflow', () => {
    let customerId = '';

    it('creates quotation with line item', async () => {
      const cust = await request(app.getHttpServer())
        .post('/api/v1/crm/customers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ companyName: 'Revision Buyer', email: `buyer-${tag}@test.com`, status: 'ACTIVE' });
      customerId = (cust.body.data ?? cust.body).id;

      const qtn = await request(app.getHttpServer())
        .post('/api/v1/crm/quotations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ customerId, scopeOfWork: 'Phase 1 delivery' });
      expect([200, 201]).toContain(qtn.status);
      quotationRootId = (qtn.body.data ?? qtn.body).id;
      expect((qtn.body.data ?? qtn.body).revisionNumber).toBe(1);

      await request(app.getHttpServer())
        .post('/api/v1/crm/quotation-items')
        .query({ quotationId: quotationRootId })
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ itemName: 'Services', quantity: 1, unitPrice: 1000, taxRate: 0 });
    });

    it('creates revision 2 and 3 with incrementing numbers', async () => {
      let currentId = quotationRootId;
      for (const n of [2, 3]) {
        const rev = await request(app.getHttpServer())
          .post(`/api/v1/crm/quotations/${currentId}/revision`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ revisionReason: `Revision ${n} pricing update` });
        expect([200, 201]).toContain(rev.status);
        const body = rev.body.data ?? rev.body;
        expect(body.revisionNumber).toBe(n);
        currentId = body.id;
      }
      quotationLatestId = currentId;

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/crm/quotations/${quotationLatestId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      const q = detail.body.data ?? detail.body;
      expect(q.revisionNumber).toBe(3);

      const rootDetail = await request(app.getHttpServer())
        .get(`/api/v1/crm/quotations/${quotationRootId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      const root = rootDetail.body.data ?? rootDetail.body;
      expect(Array.isArray(root.revisions)).toBe(true);
      expect(root.revisions.length).toBeGreaterThanOrEqual(2);

      const history = await request(app.getHttpServer())
        .get(`/api/v1/crm/quotations/${quotationRootId}/approval-history`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(history.status).toBe(200);
      const events = history.body.data ?? history.body;
      expect(events.some((e: { action: string }) => e.action === 'REVISION_CREATED')).toBe(true);
    });

    it('generates PDF for latest revision', async () => {
      const pdf = await request(app.getHttpServer())
        .post(`/api/v1/crm/proposals/generate/${quotationLatestId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect([200, 201]).toContain(pdf.status);
    });

    it('portal send and approval applies to latest revision only', async () => {
      const sent = await request(app.getHttpServer())
        .post(`/api/v1/crm/quotations/${quotationLatestId}/send`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});
      expect([200, 201]).toContain(sent.status);
      portalToken = (sent.body.data ?? sent.body).portalToken;
      expect(portalToken).toBeTruthy();

      const view = await request(app.getHttpServer()).get(
        `/api/v1/crm/customer-view/${portalToken}`,
      );
      expect(view.status).toBe(200);
      expect((view.body.data ?? view.body).revisionNumber).toBe(3);

      const accept = await request(app.getHttpServer())
        .post(`/api/v1/crm/customer-view/${portalToken}/accept`)
        .send({ comments: 'Approved latest revision' });
      expect([200, 201]).toContain(accept.status);

      const latest = await request(app.getHttpServer())
        .get(`/api/v1/crm/quotations/${quotationLatestId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect((latest.body.data ?? latest.body).status).toBe('APPROVED');

      const root = await request(app.getHttpServer())
        .get(`/api/v1/crm/quotations/${quotationRootId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect((root.body.data ?? root.body).status).not.toBe('APPROVED');
    });
  });

  describe('OTP production response shape', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('never returns devCode when NODE_ENV=production', async () => {
      process.env.NODE_ENV = 'production';
      const email = `prod-otp-${tag}@readiness.test`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup/request-otp')
        .send({ email, companyName: 'Prod OTP Corp' });
      expect(res.status).toBe(503);
      expect(res.body.devCode).toBeUndefined();
      expect(res.body.data?.devCode).toBeUndefined();
    });
  });
});
