import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { RedisService } from "../src/redis/redis.service";
import { disconnectTestDb } from "./helpers/tenant-seed";
import { generateInviteToken, hashInviteToken } from "../src/tenant-admin/tenant-admin.utils";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("Release flow — signup to CRM access (e2e)", () => {
  let app: INestApplication;
  let redis: RedisService;
  const tag = Date.now();
  const ownerEmail = `release-owner-${tag}@flow.test`;
  const inviteEmail = `release-invite-${tag}@flow.test`;
  const companyName = `Release Flow Corp ${tag}`;
  let devCode = "";
  let verificationToken = "";
  let ownerToken = "";
  let tenantId = "";

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://127.0.0.1:6379";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    redis = moduleRef.get(RedisService);
  });

  afterAll(async () => {
    await redis?.client?.del(`velon:signup:otp:${ownerEmail}`);
    await app?.close();
    await disconnectTestDb();
  });

  it("1. Tenant registration — request OTP", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/signup/request-otp")
      .send({ email: ownerEmail, companyName });
    expect(res.status).toBe(201);
    const body = res.body.data ?? res.body;
    devCode = body.devCode;
    expect(devCode).toMatch(/^\d{6}$/);
  });

  it("2. OTP verification", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/signup/verify-otp")
      .send({ email: ownerEmail, code: devCode });
    expect(res.status).toBe(201);
    verificationToken = (res.body.data ?? res.body).verificationToken;
    expect(verificationToken.length).toBeGreaterThan(16);
  });

  it("3. Workspace + tenant creation via signup", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/signup")
      .send({
        companyEmail: ownerEmail,
        companyPhone: "+91 9999999999",
        country: "India",
        industry: "SERVICES",
        password: "ReleaseFlow123!",
        companyName,
        verificationToken,
        fullName: "Release Owner",
      });
    expect([200, 201]).toContain(res.status);
    const body = res.body.data ?? res.body;
    ownerToken = body.accessToken;
    tenantId = body.tenantId;
    expect(ownerToken).toBeTruthy();
    expect(tenantId).toBeTruthy();
  });

  it("4. Tenant login", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: ownerEmail, password: "ReleaseFlow123!" });
    expect(res.status).toBe(201);
    ownerToken = (res.body.data ?? res.body).accessToken;
    expect(ownerToken).toBeTruthy();
  });

  it("5. Workspace dashboard returns live data", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/workspace/dashboard")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.company.name).toContain("Release Flow");
    expect(body.workspace.name).toBeTruthy();
    expect(body.subscription.plan).toBeTruthy();
    expect(typeof body.seats.used).toBe("number");
    expect(typeof body.team.activeUsers).toBe("number");
  });

  it("6. Invite user", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/tenant-admin/invitations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ fullName: "Invited Member", email: inviteEmail, role: "USER" });
    expect([200, 201]).toContain(res.status);
  });

  it("7. User accepts invite", async () => {
    const { PrismaClient } = await import("@velon/database");
    const prisma = new PrismaClient();
    const inv = await prisma.tenantInvitation.findFirst({
      where: { tenantId, email: inviteEmail },
      orderBy: { createdAt: "desc" },
    });
    expect(inv).toBeTruthy();
    const token = generateInviteToken();
    await prisma.tenantInvitation.update({
      where: { id: inv!.id },
      data: { tokenHash: hashInviteToken(token) },
    });
    await prisma.$disconnect();

    const accept = await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .send({ token, password: "InviteMember123!" });
    expect(accept.status).toBe(201);
  });

  it("8. Invited user login", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: inviteEmail, password: "InviteMember123!" });
    expect(res.status).toBe(201);
    const memberToken = (res.body.data ?? res.body).accessToken;
    expect(memberToken).toBeTruthy();
  });

  it("9. CRM access (tenant-scoped)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/crm/customers")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  it("10. Audit log generated", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/tenant-admin/overview")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(Array.isArray(body.auditLogs)).toBe(true);
    expect(body.auditLogs.length).toBeGreaterThan(0);
  });
});
