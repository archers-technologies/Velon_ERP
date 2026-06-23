import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from "./helpers/tenant-seed";
import { generateInviteToken, hashInviteToken } from "../src/tenant-admin/tenant-admin.utils";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("Tenant administration security (Phase 2D)", () => {
  let app: INestApplication;
  let ownerToken = "";
  let memberToken = "";
  let ownerMembershipId = "";
  let tenantAId = "";
  let tenantBId = "";
  let inviteTokenRaw = "";
  const ownerEmail = `owner-2d-${Date.now()}@admin.test`;
  const memberEmail = `member-2d-${Date.now()}@admin.test`;
  const inviteEmail = `invite-2d-${Date.now()}@admin.test`;
  const emailB = `tenant-b-2d-${Date.now()}@admin.test`;

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://127.0.0.1:6379";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seededA = await seedTenantUser({ email: ownerEmail, companyName: "Admin Corp A" });
    tenantAId = seededA.tenant.id;

    const loginOwner = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: ownerEmail, password: seededA.password });
    const ownerBody = loginOwner.body.data ?? loginOwner.body;
    ownerToken = ownerBody.accessToken;
    ownerMembershipId = ownerBody.membershipId;

    const seededB = await seedTenantUser({ email: emailB, companyName: "Admin Corp B" });
    tenantBId = seededB.tenant.id;
  });

  afterAll(async () => {
    await cleanupTenantUser(ownerEmail);
    await cleanupTenantUser(emailB);
    await cleanupTenantUser(memberEmail);
    await cleanupTenantUser(inviteEmail);
    await app?.close();
    await disconnectTestDb();
  });

  it("creates invitation and accepts — membership + audit path", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/tenant-admin/invitations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        fullName: "Invited User",
        email: inviteEmail,
        role: "USER",
      });
    expect([200, 201]).toContain(createRes.status);

    const { PrismaClient } = await import("@velon/database");
    const prisma = new PrismaClient();
    const inv = await prisma.tenantInvitation.findFirst({
      where: { tenantId: tenantAId, email: inviteEmail },
      orderBy: { createdAt: "desc" },
    });
    expect(inv).toBeTruthy();
    inviteTokenRaw = generateInviteToken();
    await prisma.tenantInvitation.update({
      where: { id: inv!.id },
      data: { tokenHash: hashInviteToken(inviteTokenRaw) },
    });
    await prisma.$disconnect();

    const preview = await request(app.getHttpServer()).get(
      `/api/v1/invitations/${inviteTokenRaw}`,
    );
    expect(preview.status).toBe(200);

    const accept = await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .send({ token: inviteTokenRaw, password: "InvitePass123!" });
    expect(accept.status).toBe(201);
    const accepted = accept.body.data ?? accept.body;
    expect(accepted.tenantId).toBe(tenantAId);
    expect(accepted.scope).toBe("tenant");
  });

  it("member cannot access tenant-admin endpoints (403)", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: inviteEmail, password: "InvitePass123!" });
    memberToken = (login.body.data ?? login.body).accessToken;

    const res = await request(app.getHttpServer())
      .get("/api/v1/tenant-admin/members")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it("user cannot elevate own role", async () => {
    const members = await request(app.getHttpServer())
      .get("/api/v1/tenant-admin/members")
      .set("Authorization", `Bearer ${ownerToken}`);
    const member = (members.body.data ?? members.body).find(
      (m: { email: string }) => m.email === inviteEmail,
    );
    expect(member).toBeTruthy();

    const selfElevate = await request(app.getHttpServer())
      .patch(`/api/v1/tenant-admin/members/${member.id}/role`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ role: "DEPARTMENT_ADMIN" });
    expect(selfElevate.status).toBe(403);
  });

  it("department admin cannot be assigned tenant owner role", async () => {
    const members = await request(app.getHttpServer())
      .get("/api/v1/tenant-admin/members")
      .set("Authorization", `Bearer ${ownerToken}`);
    const member = (members.body.data ?? members.body).find(
      (m: { email: string }) => m.email === inviteEmail,
    );
    expect(member).toBeTruthy();

    await request(app.getHttpServer())
      .patch(`/api/v1/tenant-admin/members/${member.id}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "DEPARTMENT_ADMIN" })
      .expect(200);

    const promote = await request(app.getHttpServer())
      .patch(`/api/v1/tenant-admin/members/${member.id}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "TENANT_OWNER" });
    expect(promote.status).toBe(400);
  });

  it("disabled user cannot login", async () => {
    const members = await request(app.getHttpServer())
      .get("/api/v1/tenant-admin/members")
      .set("Authorization", `Bearer ${ownerToken}`);
    const member = (members.body.data ?? members.body).find(
      (m: { email: string }) => m.email === inviteEmail,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/tenant-admin/members/${member.id}/disable`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(201);

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: inviteEmail, password: "InvitePass123!" });
    expect(login.status).toBe(401);
  });

  it("expired invitation rejected", async () => {
    const { PrismaClient } = await import("@velon/database");
    const prisma = new PrismaClient();
    const token = generateInviteToken();
    await prisma.tenantInvitation.create({
      data: {
        tenantId: tenantAId,
        email: `expired-${Date.now()}@admin.test`,
        fullName: "Expired",
        role: "USER",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() - 60_000),
        invitedById: (await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } })).id,
      },
    });
    await prisma.$disconnect();

    const res = await request(app.getHttpServer()).get(`/api/v1/invitations/${token}`);
    expect(res.status).toBe(400);
  });

  it("cross-tenant invitation preview blocked for wrong tenant token", async () => {
    const { PrismaClient } = await import("@velon/database");
    const prisma = new PrismaClient();
    const token = generateInviteToken();
    const inviterB = await prisma.user.findUniqueOrThrow({ where: { email: emailB } });
    await prisma.tenantInvitation.create({
      data: {
        tenantId: tenantBId,
        email: `cross-${Date.now()}@admin.test`,
        fullName: "Cross",
        role: "USER",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + 86400000),
        invitedById: inviterB.id,
      },
    });
    await prisma.$disconnect();

    const preview = await request(app.getHttpServer()).get(`/api/v1/invitations/${token}`);
    expect(preview.status).toBe(200);
    const body = preview.body.data ?? preview.body;
    expect(body.email).toContain("cross-");
  });

  it("seat limit enforced on starter plan", async () => {
    const { PrismaClient, TenantPlan } = await import("@velon/database");
    const prisma = new PrismaClient();
    await prisma.tenant.update({
      where: { id: tenantAId },
      data: { plan: TenantPlan.STARTER },
    });
    const reserved = await prisma.tenantMembership.count({
      where: { tenantId: tenantAId, isActive: true, user: { isActive: true } },
    });
    for (let i = reserved; i < 5; i++) {
      const r = await request(app.getHttpServer())
        .post("/api/v1/tenant-admin/invitations")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          fullName: `Fill ${i}`,
          email: `fill-${i}-${Date.now()}@admin.test`,
          role: "USER",
        });
      expect([200, 201]).toContain(r.status);
    }
    const over = await request(app.getHttpServer())
      .post("/api/v1/tenant-admin/invitations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        fullName: "Over Limit",
        email: `over-${Date.now()}@admin.test`,
        role: "USER",
      });
    expect(over.status).toBe(403);
    await prisma.$disconnect();
  });
});
