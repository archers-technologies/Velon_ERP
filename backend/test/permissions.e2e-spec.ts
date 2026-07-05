import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from './helpers/tenant-seed';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

type RoleToken = { role: string; token: string };

describeIfDb('PermissionGuard role matrix (Phase 5B)', () => {
  let app: INestApplication;
  let ownerToken = '';
  let tenantId = '';
  const ownerEmail = `perm-owner-${Date.now()}@perm.test`;
  const roleEmails = {
    TENANT_ADMIN: `perm-admin-${Date.now()}@perm.test`,
    DEPARTMENT_ADMIN: `perm-dept-${Date.now()}@perm.test`,
    USER: `perm-user-${Date.now()}@perm.test`,
    TENANT_USER: `perm-tenant-user-${Date.now()}@perm.test`,
  };
  const rolePassword = 'PermTestPass123!';
  const tokens: RoleToken[] = [];

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://127.0.0.1:6379';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seeded = await seedTenantUser({ email: ownerEmail, companyName: 'Perm Matrix Corp' });
    tenantId = seeded.tenant.id;

    const loginOwner = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: seeded.password });
    ownerToken = (loginOwner.body.data ?? loginOwner.body).accessToken;
    tokens.push({ role: 'TENANT_OWNER', token: ownerToken });

    const { PrismaClient, UserRole } = await import('@velon/database');
    const prisma = new PrismaClient();
    const hash = await bcrypt.hash(rolePassword, 12);

    for (const [role, email] of Object.entries(roleEmails)) {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          name: `Perm ${role}`,
          role: UserRole.USER,
        },
      });
      await prisma.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId,
          role: UserRole[role as keyof typeof UserRole],
          isActive: true,
        },
      });

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: rolePassword });
      tokens.push({ role, token: (login.body.data ?? login.body).accessToken });
    }

    await prisma.$disconnect();
  });

  afterAll(async () => {
    await cleanupTenantUser(ownerEmail);
    for (const email of Object.values(roleEmails)) {
      await cleanupTenantUser(email);
    }
    await app?.close();
    await disconnectTestDb();
  });

  function tokenFor(role: string) {
    const row = tokens.find((t) => t.role === role);
    if (!row) throw new Error(`Missing token for ${role}`);
    return row.token;
  }

  const writeRoles = ['TENANT_OWNER', 'TENANT_ADMIN', 'DEPARTMENT_ADMIN'] as const;
  const readOnlyRoles = ['USER', 'TENANT_USER'] as const;

  it.each(writeRoles)('%s can create inventory product (inventory:write)', async (role) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/products')
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .send({ name: `Widget ${role}`, quantity: 1 });
    expect(res.status).toBe(201);
  });

  it.each(readOnlyRoles)('%s cannot create inventory product (403)', async (role) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/products')
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .send({ name: `Denied ${role}`, quantity: 1 });
    expect(res.status).toBe(403);
  });

  it.each([...writeRoles, ...readOnlyRoles])('%s can read inventory stock', async (role) => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory/stock')
      .set('Authorization', `Bearer ${tokenFor(role)}`);
    expect(res.status).toBe(200);
  });

  it.each(writeRoles)('%s can create supplier (procurement:write)', async (role) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .send({ name: `Supplier ${role}` });
    expect(res.status).toBe(201);
  });

  it.each(readOnlyRoles)('%s cannot create supplier (403)', async (role) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .send({ name: `Denied supplier ${role}` });
    expect(res.status).toBe(403);
  });

  it.each(writeRoles)('%s can create purchase request', async (role) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/procurement/requests')
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .send({ items: [{ description: `PR ${role}`, quantity: 1 }] });
    expect(res.status).toBe(201);
  });

  it.each(readOnlyRoles)('%s cannot create purchase request (403)', async (role) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/procurement/requests')
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .send({ items: [{ description: `Denied PR ${role}`, quantity: 1 }] });
    expect(res.status).toBe(403);
  });
});
