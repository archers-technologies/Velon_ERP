import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from "./helpers/tenant-seed";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("Tenant isolation security (Phase 2C)", () => {
  let app: INestApplication;
  let tokenA = "";
  let tokenB = "";
  let tenantAId = "";
  let tenantBId = "";
  let customerAId = "";
  let projectAId = "";
  let assetAId = "";
  let fileAId = "";
  let notificationAId = "";
  const emailA = `tenant-a-${Date.now()}@isolation.test`;
  const emailB = `tenant-b-${Date.now()}@isolation.test`;

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://127.0.0.1:6379";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seededA = await seedTenantUser({ email: emailA, companyName: "Isolation Corp A" });
    const seededB = await seedTenantUser({ email: emailB, companyName: "Isolation Corp B" });
    tenantAId = seededA.tenant.id;
    tenantBId = seededB.tenant.id;

    const loginA = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emailA, password: seededA.password });
    const loginB = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emailB, password: seededB.password });

    const bodyA = loginA.body.data ?? loginA.body;
    const bodyB = loginB.body.data ?? loginB.body;
    tokenA = bodyA.accessToken;
    tokenB = bodyB.accessToken;
    expect(bodyA.scope).toBe("tenant");
    expect(bodyB.scope).toBe("tenant");
    expect(bodyA.tenantId).toBe(tenantAId);
    expect(bodyB.tenantId).toBe(tenantBId);
  });

  afterAll(async () => {
    await cleanupTenantUser(emailA);
    await cleanupTenantUser(emailB);
    await app?.close();
    await disconnectTestDb();
  });

  it("Test A — Tenant B cannot see Tenant A customer", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/tenant-resources/customers")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Customer Alpha" });
    expect([200, 201]).toContain(createRes.status);
    const created = createRes.body.data ?? createRes.body;
    customerAId = created.id;
    expect(created.tenantId).toBe(tenantAId);

    const listB = await request(app.getHttpServer())
      .get("/api/v1/tenant-resources/customers")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(listB.status).toBe(200);
    const rows = listB.body.data ?? listB.body;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.find((r: { id: string }) => r.id === customerAId)).toBeUndefined();
  });

  it("Test B — Tenant B cannot access Tenant A project", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/tenant-resources/projects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Project Alpha" });
    expect([200, 201]).toContain(createRes.status);
    const created = createRes.body.data ?? createRes.body;
    projectAId = created.id;

    const getB = await request(app.getHttpServer())
      .get(`/api/v1/tenant-resources/projects/${projectAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(getB.status).toBe(404);
  });

  it("Test C — Tenant session cannot access platform tenants API (403)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/tenants")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });

  it("Test D — Payload tenantId spoof ignored; record stays in JWT tenant", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/tenant-resources/customers")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Spoof Test", tenantId: tenantBId });
    expect(res.status).toBe(201);
    const created = res.body.data ?? res.body;
    expect(created.tenantId).toBe(tenantAId);
    expect(created.tenantId).not.toBe(tenantBId);
  });

  it("Test E — Cross-tenant list returns zero foreign records", async () => {
    const listA = await request(app.getHttpServer())
      .get("/api/v1/tenant-resources/customers")
      .set("Authorization", `Bearer ${tokenA}`);
    const listB = await request(app.getHttpServer())
      .get("/api/v1/tenant-resources/customers")
      .set("Authorization", `Bearer ${tokenB}`);

    const rowsA = listA.body.data ?? listA.body;
    const rowsB = listB.body.data ?? listB.body;

    for (const row of rowsA as { tenantId: string }[]) {
      expect(row.tenantId).toBe(tenantAId);
    }
    for (const row of rowsB as { tenantId: string }[]) {
      expect(row.tenantId).toBe(tenantBId);
    }
    const leak = (rowsB as { id: string }[]).some((r) => r.id === customerAId);
    expect(leak).toBe(false);
  });

  it("Test F — Tenant B cannot access Tenant A asset", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/tenant-resources/assets")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Asset Alpha", tag: "AST-001" });
    expect([200, 201]).toContain(createRes.status);
    assetAId = (createRes.body.data ?? createRes.body).id;

    const getB = await request(app.getHttpServer())
      .get(`/api/v1/tenant-resources/assets/${assetAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(getB.status).toBe(404);

    const listB = await request(app.getHttpServer())
      .get("/api/v1/tenant-resources/assets")
      .set("Authorization", `Bearer ${tokenB}`);
    const rows = listB.body.data ?? listB.body;
    expect(rows.find((r: { id: string }) => r.id === assetAId)).toBeUndefined();
  });

  it("Test G — Tenant B cannot access Tenant A file metadata", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/tenant-resources/files")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "contract.pdf", mimeType: "application/pdf", sizeBytes: 1024 });
    expect([200, 201]).toContain(createRes.status);
    fileAId = (createRes.body.data ?? createRes.body).id;

    const getB = await request(app.getHttpServer())
      .get(`/api/v1/tenant-resources/files/${fileAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(getB.status).toBe(404);
  });

  it("Test H — Tenant B cannot read Tenant A notification", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/tenant-resources/notifications")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Alert Alpha", body: "Tenant A only" });
    expect([200, 201]).toContain(createRes.status);
    notificationAId = (createRes.body.data ?? createRes.body).id;

    const getB = await request(app.getHttpServer())
      .get(`/api/v1/tenant-resources/notifications/${notificationAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(getB.status).toBe(404);

    const listB = await request(app.getHttpServer())
      .get("/api/v1/tenant-resources/notifications")
      .set("Authorization", `Bearer ${tokenB}`);
    const rows = listB.body.data ?? listB.body;
    expect(rows.find((r: { id: string }) => r.id === notificationAId)).toBeUndefined();
  });

  it("Portal separation — platform login blocked for tenant user on /tenants", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/platform/overview")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });
});
