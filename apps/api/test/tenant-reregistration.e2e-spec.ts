import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createHash } from "node:crypto";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { UserRole } from "@velon/database";
import { AppModule } from "../src/app.module";
import { RedisService } from "../src/redis/redis.service";
import { cleanupTenantUser, disconnectTestDb, prisma } from "./helpers/tenant-seed";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("Tenant re-registration after deletion", () => {
  let app: INestApplication;
  let redis: RedisService;
  const tag = Date.now();
  const password = "ReregOwner123!";
  let superAdminToken = "";

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

    const superAdminEmail = `e2e-super-admin-${tag}@platform.test`;
    const superAdminPassword = "SuperAdmin123!";
    await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: {
        passwordHash: await bcrypt.hash(superAdminPassword, 10),
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        seedSource: "e2e",
      },
      create: {
        email: superAdminEmail,
        passwordHash: await bcrypt.hash(superAdminPassword, 10),
        name: "E2E Super Admin",
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        seedSource: "e2e",
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: superAdminEmail,
        password: superAdminPassword,
      });
    expect([200, 201]).toContain(adminLogin.status);
    superAdminToken = (adminLogin.body.data ?? adminLogin.body).accessToken;
    expect(superAdminToken).toBeTruthy();
  });

  afterAll(async () => {
    await app?.close();
    await disconnectTestDb();
  });

  async function resolveOtpCode(email: string, devCode?: string) {
    if (devCode?.match(/^\d{6}$/)) return devCode;

    const stored = await redis.client.get(`velon:signup:otp:${email.toLowerCase()}`);
    expect(stored).toBeTruthy();
    const record = JSON.parse(stored!) as { otpHash: string };
    const secret = process.env.AUTH_OTP_SECRET ?? "";
    expect(secret.length).toBeGreaterThan(16);
    const normalized = email.trim().toLowerCase();

    for (let i = 100000; i < 1000000; i++) {
      const code = String(i);
      const hash = createHash("sha256").update(`${normalized}:${code}:${secret}`).digest("hex");
      if (hash === record.otpHash) return code;
    }
    throw new Error("Could not resolve OTP code from Redis");
  }

  async function signupWithOtp(email: string, companyName: string) {
    await redis.client.del(`velon:signup:otp:${email.toLowerCase()}`);

    const otpRes = await request(app.getHttpServer())
      .post("/api/v1/auth/signup/request-otp")
      .send({ email, companyName });
    expect(otpRes.status).toBe(201);
    const otpBody = otpRes.body.data ?? otpRes.body;
    const code = await resolveOtpCode(email, otpBody.devCode as string | undefined);
    const verifyRes = await request(app.getHttpServer())
      .post("/api/v1/auth/signup/verify-otp")
      .send({ email, code });
    expect(verifyRes.status).toBe(201);
    const verifyBody = verifyRes.body.data ?? verifyRes.body;

    return request(app.getHttpServer())
      .post("/api/v1/auth/signup")
      .send({
        companyName,
        companyEmail: email,
        companyPhone: "+1 555 0100",
        countryCode: "US",
        currency: "USD",
        timezone: "America/New_York",
        address: "100 Main St, New York, NY",
        industry: "SERVICES",
        fullName: "Reactivation Owner",
        password,
        verificationToken: verifyBody.verificationToken,
      });
  }

  it("allows the same email to register again after platform tenant deletion", async () => {
    const ownerEmail = `rereg-owner-${tag}@reactivation.test`;
    const companyName = `Reactivation Co ${tag}`;

    const firstSignup = await signupWithOtp(ownerEmail, companyName);
    expect([200, 201]).toContain(firstSignup.status);
    const firstBody = firstSignup.body.data ?? firstSignup.body;
    const tenantId = firstBody.tenantId as string;
    expect(tenantId).toBeTruthy();

    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/tenants/${tenantId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(deleteRes.status).toBe(200);
    expect((deleteRes.body.data ?? deleteRes.body).deleted).toBe(true);

    const secondSignup = await signupWithOtp(ownerEmail, `${companyName} II`);
    expect([200, 201]).toContain(secondSignup.status);
    expect((secondSignup.body.data ?? secondSignup.body).accessToken).toBeTruthy();

    await cleanupTenantUser(ownerEmail);
  });

  it("allows workspace owner to delete workspace and register again", async () => {
    const email = `self-delete-${tag}@reactivation.test`;
    const companyName = `Self Delete Co ${tag}`;

    const signupRes = await signupWithOtp(email, companyName);
    expect([200, 201]).toContain(signupRes.status);
    const signupBody = signupRes.body.data ?? signupRes.body;
    const token = signupBody.accessToken as string;

    const deleteRes = await request(app.getHttpServer())
      .delete("/api/v1/tenant-admin/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ password, confirmPhrase: "DELETE" });
    expect(deleteRes.status).toBe(200);
    expect((deleteRes.body.data ?? deleteRes.body).deleted).toBe(true);

    const again = await signupWithOtp(email, `${companyName} Return`);
    expect([200, 201]).toContain(again.status);

    await cleanupTenantUser(email);
  });
});
