import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from "./helpers/tenant-seed";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("CRM tenant isolation (Phase 3A)", () => {
  let app: INestApplication;
  let tokenA = "";
  let tokenB = "";
  let memberToken = "";
  let tenantAId = "";
  let customerAId = "";
  let contactAId = "";
  let noteAId = "";
  let activityAId = "";
  let ownerPassword = "";
  const emailA = `crm-a-${Date.now()}@crm.test`;
  const emailB = `crm-b-${Date.now()}@crm.test`;
  const memberEmail = `crm-member-${Date.now()}@crm.test`;
  const memberPassword = "CrmMemberPass123!";

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://127.0.0.1:6379";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seededA = await seedTenantUser({ email: emailA, companyName: "CRM Corp A" });
    tenantAId = seededA.tenant.id;
    ownerPassword = seededA.password;
    await seedTenantUser({ email: emailB, companyName: "CRM Corp B" });

    const loginA = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emailA, password: ownerPassword });
    tokenA = (loginA.body.data ?? loginA.body).accessToken;

    const loginB = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emailB, password: ownerPassword });
    tokenB = (loginB.body.data ?? loginB.body).accessToken;

    const { PrismaClient, UserRole } = await import("@velon/database");
    const prisma = new PrismaClient();
    const hash = await bcrypt.hash(memberPassword, 12);
    const memberUser = await prisma.user.create({
      data: {
        email: memberEmail,
        passwordHash: hash,
        name: "CRM Member",
        role: UserRole.USER,
      },
    });
    await prisma.tenantMembership.create({
      data: {
        userId: memberUser.id,
        tenantId: tenantAId,
        role: UserRole.USER,
        isActive: true,
      },
    });
    await prisma.$disconnect();

    const loginMember = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: memberEmail, password: memberPassword });
    memberToken = (loginMember.body.data ?? loginMember.body).accessToken;
  });

  afterAll(async () => {
    await cleanupTenantUser(emailA);
    await cleanupTenantUser(emailB);
    await cleanupTenantUser(memberEmail);
    await app?.close();
    await disconnectTestDb();
  });

  it("creates CRM customer", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/crm/customers")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ companyName: "Acme Holdings", email: "billing@acme.test", status: "ACTIVE" });
    expect([200, 201]).toContain(res.status);
    const body = res.body.data ?? res.body;
    customerAId = body.id;
    expect(body.tenantId).toBe(tenantAId);
    expect(body.customerCode).toMatch(/^CUS-/);
  });

  it("Tenant B cannot see Tenant A CRM customer", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/v1/crm/customers")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(list.status).toBe(200);
    const rows = list.body.data ?? list.body;
    expect(rows.find((r: { id: string }) => r.id === customerAId)).toBeUndefined();

    const getOne = await request(app.getHttpServer())
      .get(`/api/v1/crm/customers/${customerAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(getOne.status).toBe(404);
  });

  it("creates contact, note, and activity", async () => {
    const contact = await request(app.getHttpServer())
      .post("/api/v1/crm/contacts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        customerId: customerAId,
        firstName: "Jane",
        lastName: "Buyer",
        email: "jane@acme.test",
      });
    expect([200, 201]).toContain(contact.status);
    contactAId = (contact.body.data ?? contact.body).id;

    const note = await request(app.getHttpServer())
      .post("/api/v1/crm/notes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        targetType: "CUSTOMER",
        targetId: customerAId,
        content: "Initial discovery call went well.",
      });
    expect([200, 201]).toContain(note.status);
    noteAId = (note.body.data ?? note.body).id;

    const activity = await request(app.getHttpServer())
      .post("/api/v1/crm/activities")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        customerId: customerAId,
        contactId: contactAId,
        type: "CALL",
        title: "Follow-up call",
        activityDate: new Date().toISOString(),
      });
    expect([200, 201]).toContain(activity.status);
    activityAId = (activity.body.data ?? activity.body).id;
  });

  it("Tenant B cannot access Tenant A contact or notes", async () => {
    const contact = await request(app.getHttpServer())
      .get(`/api/v1/crm/contacts/${contactAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(contact.status).toBe(404);

    const notes = await request(app.getHttpServer())
      .get(`/api/v1/crm/notes?targetType=CUSTOMER&targetId=${customerAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(notes.status).toBe(404);
  });

  it("archived customer hidden unless includeArchived", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/crm/customers/${customerAId}/archive`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(201);

    const list = await request(app.getHttpServer())
      .get("/api/v1/crm/customers")
      .set("Authorization", `Bearer ${tokenA}`);
    const rows = list.body.data ?? list.body;
    expect(rows.find((r: { id: string }) => r.id === customerAId)).toBeUndefined();

    const archived = await request(app.getHttpServer())
      .get("/api/v1/crm/customers?includeArchived=true")
      .set("Authorization", `Bearer ${tokenA}`);
    const all = archived.body.data ?? archived.body;
    expect(all.find((r: { id: string }) => r.id === customerAId)).toBeTruthy();
  });

  it("USER role cannot create customers", async () => {
    const create = await request(app.getHttpServer())
      .post("/api/v1/crm/customers")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ companyName: "Should Fail Inc" });
    expect(create.status).toBe(403);
  });

  it("completes activity after restore", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/crm/customers/${customerAId}/restore`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(201);

    const complete = await request(app.getHttpServer())
      .post(`/api/v1/crm/activities/${activityAId}/complete`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect([200, 201]).toContain(complete.status);
    expect((complete.body.data ?? complete.body).status).toBe("COMPLETED");
  });
});
