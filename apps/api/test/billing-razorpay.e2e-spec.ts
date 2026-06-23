import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createHmac } from "crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setRazorpayOrderCreatorForTests } from "../src/billing/providers/razorpay.client";
import {
  cleanupTenantUser,
  disconnectTestDb,
  prisma,
  seedTenantUser,
} from "./helpers/tenant-seed";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("Billing — Razorpay and manual bank transfer (e2e)", () => {
  let app: INestApplication;
  const tag = Date.now();
  const ownerEmail = `billing-owner-${tag}@billing.test`;
  const otherEmail = `billing-other-${tag}@billing.test`;
  let ownerToken = "";
  let otherToken = "";
  let tenantId = "";
  let otherTenantId = "";

  const razorpayEnv = {
    RAZORPAY_ENABLED: process.env.RAZORPAY_ENABLED,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_CURRENCY: process.env.RAZORPAY_CURRENCY,
  };

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://127.0.0.1:6379";

    process.env.RAZORPAY_ENABLED = "false";
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seeded = await seedTenantUser({ email: ownerEmail, companyName: `Billing Corp ${tag}` });
    tenantId = seeded.tenant.id;
    const other = await seedTenantUser({ email: otherEmail, companyName: `Other Billing ${tag}` });
    otherTenantId = other.tenant.id;

    const loginOwner = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: ownerEmail, password: seeded.password });
    ownerToken = (loginOwner.body.data ?? loginOwner.body).accessToken;

    const loginOther = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: otherEmail, password: other.password });
    otherToken = (loginOther.body.data ?? loginOther.body).accessToken;
  });

  afterAll(async () => {
    process.env.RAZORPAY_ENABLED = razorpayEnv.RAZORPAY_ENABLED;
    if (razorpayEnv.RAZORPAY_KEY_ID) process.env.RAZORPAY_KEY_ID = razorpayEnv.RAZORPAY_KEY_ID;
    else delete process.env.RAZORPAY_KEY_ID;
    if (razorpayEnv.RAZORPAY_KEY_SECRET) process.env.RAZORPAY_KEY_SECRET = razorpayEnv.RAZORPAY_KEY_SECRET;
    else delete process.env.RAZORPAY_KEY_SECRET;
    if (razorpayEnv.RAZORPAY_WEBHOOK_SECRET) {
      process.env.RAZORPAY_WEBHOOK_SECRET = razorpayEnv.RAZORPAY_WEBHOOK_SECRET;
    } else delete process.env.RAZORPAY_WEBHOOK_SECRET;
    if (razorpayEnv.RAZORPAY_CURRENCY) process.env.RAZORPAY_CURRENCY = razorpayEnv.RAZORPAY_CURRENCY;

    setRazorpayOrderCreatorForTests(null);
    await cleanupTenantUser(ownerEmail);
    await cleanupTenantUser(otherEmail);
    await app?.close();
    await disconnectTestDb();
  });

  it("payment-config hides Razorpay when disabled", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/billing/payment-config")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.bankTransfer).toBe(true);
    expect(body.razorpay.enabled).toBe(false);
    expect(body.razorpay.keyId).toBeNull();
  });

  it("rejects Razorpay checkout when disabled", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/checkout")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        plan: "STARTER",
        billingInterval: "MONTHLY",
        provider: "RAZORPAY",
        idempotencyKey: `rzp-disabled-${tag}`,
      });
    expect(res.status).toBe(400);
  });

  it("bank transfer checkout still works", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/checkout")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        plan: "STARTER",
        billingInterval: "MONTHLY",
        provider: "BANK_TRANSFER",
        idempotencyKey: `bank-${tag}`,
      });
    expect([200, 201]).toContain(res.status);
    const body = res.body.data ?? res.body;
    expect(body.session.provider).toBe("BANK_TRANSFER");
    expect(body.session.instructions).toBeTruthy();
  });

  describe("with Razorpay configured", () => {
    const keySecret = "test_razorpay_secret";
    const webhookSecret = "whsec_test_billing";
    let orderId = "";
    const paymentId = `pay_${tag}`;

    beforeAll(() => {
      process.env.RAZORPAY_ENABLED = "true";
      process.env.RAZORPAY_KEY_ID = "rzp_test_key";
      process.env.RAZORPAY_KEY_SECRET = keySecret;
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
      process.env.RAZORPAY_CURRENCY = "INR";

      setRazorpayOrderCreatorForTests(async (input) => {
        orderId = `order_${input.receipt}`;
        return {
          id: orderId,
          amount: input.amountMinor,
          currency: input.currency,
          receipt: input.receipt,
          status: "created",
        };
      });
    });

    afterAll(async () => {
      await prisma.subscriptionPayment.deleteMany({
        where: { tenantId: { in: [tenantId, otherTenantId] } },
      });
      await prisma.subscriptionInvoice.deleteMany({
        where: { tenantId: { in: [tenantId, otherTenantId] } },
      });
      process.env.RAZORPAY_ENABLED = "false";
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
      setRazorpayOrderCreatorForTests(null);
    });

    it("creates Razorpay order with database plan amount", async () => {
      await prisma.subscriptionPayment.deleteMany({ where: { tenantId } });
      const res = await request(app.getHttpServer())
        .post("/api/v1/billing/checkout")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          plan: "GROWTH",
          billingInterval: "MONTHLY",
          provider: "RAZORPAY",
          idempotencyKey: `rzp-order-${tag}`,
        });
      expect([200, 201]).toContain(res.status);
      const body = res.body.data ?? res.body;
      expect(body.razorpay?.orderId).toBeTruthy();
      expect(body.razorpay?.keyId).toBe("rzp_test_key");
      expect(body.razorpay?.amount).toBeGreaterThan(0);
      expect(body.razorpay?.currency).toBe("INR");
      orderId = body.razorpay.orderId;
    });

    it("rejects invalid Razorpay signature without activating subscription", async () => {
      await prisma.subscriptionPayment.deleteMany({ where: { tenantId } });
      const checkout = await request(app.getHttpServer())
        .post("/api/v1/billing/checkout")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          plan: "GROWTH",
          billingInterval: "MONTHLY",
          provider: "RAZORPAY",
          idempotencyKey: `rzp-invalid-${tag}`,
        });
      const badOrderId = (checkout.body.data ?? checkout.body).razorpay.orderId;

      const res = await request(app.getHttpServer())
        .post("/api/v1/billing/razorpay/verify")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          razorpay_order_id: badOrderId,
          razorpay_payment_id: `pay_invalid_${tag}`,
          razorpay_signature: "invalid-signature",
        });
      expect(res.status).toBe(400);

      const sub = await request(app.getHttpServer())
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${ownerToken}`);
      expect((sub.body.data ?? sub.body).status).not.toBe("ACTIVE");
    });

    it("activates subscription after valid signature verification", async () => {
      await prisma.subscriptionPayment.deleteMany({ where: { tenantId } });
      const checkout = await request(app.getHttpServer())
        .post("/api/v1/billing/checkout")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          plan: "GROWTH",
          billingInterval: "MONTHLY",
          provider: "RAZORPAY",
          idempotencyKey: `rzp-verify-${tag}`,
        });
      orderId = (checkout.body.data ?? checkout.body).razorpay.orderId;

      const signature = createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const res = await request(app.getHttpServer())
        .post("/api/v1/billing/razorpay/verify")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });
      expect([200, 201]).toContain(res.status);
      const body = res.body.data ?? res.body;
      expect(body.subscription.status).toBe("ACTIVE");

      const again = await request(app.getHttpServer())
        .post("/api/v1/billing/razorpay/verify")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });
      expect([200, 201]).toContain(again.status);
      expect((again.body.data ?? again.body).payment.alreadyVerified).toBe(true);
    });

    it("enforces tenant isolation on verification", async () => {
      await prisma.subscriptionPayment.deleteMany({ where: { tenantId: otherTenantId } });
      const checkout = await request(app.getHttpServer())
        .post("/api/v1/billing/checkout")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({
          plan: "STARTER",
          billingInterval: "MONTHLY",
          provider: "RAZORPAY",
          idempotencyKey: `rzp-other-${tag}`,
        });
      const otherOrderId = (checkout.body.data ?? checkout.body).razorpay.orderId;
      const otherPaymentId = `pay_other_${tag}`;
      const signature = createHmac("sha256", keySecret)
        .update(`${otherOrderId}|${otherPaymentId}`)
        .digest("hex");

      const cross = await request(app.getHttpServer())
        .post("/api/v1/billing/razorpay/verify")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          razorpay_order_id: otherOrderId,
          razorpay_payment_id: otherPaymentId,
          razorpay_signature: signature,
        });
      expect(cross.status).toBe(400);
    });

    it("accepts valid webhook signature and is idempotent", async () => {
      await prisma.subscriptionPayment.deleteMany({ where: { tenantId: otherTenantId } });
      const checkout = await request(app.getHttpServer())
        .post("/api/v1/billing/checkout")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({
          plan: "STARTER",
          billingInterval: "MONTHLY",
          provider: "RAZORPAY",
          idempotencyKey: `rzp-webhook-${tag}`,
        });
      const webhookOrderId = (checkout.body.data ?? checkout.body).razorpay.orderId;
      const webhookPaymentId = `pay_webhook_${tag}`;

      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: webhookPaymentId,
              order_id: webhookOrderId,
              status: "captured",
              amount: 40700,
              currency: "INR",
            },
          },
        },
      };
      const raw = JSON.stringify(payload);
      const signature = createHmac("sha256", webhookSecret).update(raw).digest("hex");
      const eventId = `evt_${tag}`;

      const first = await request(app.getHttpServer())
        .post("/api/v1/billing/webhooks/razorpay")
        .set("x-razorpay-signature", signature)
        .set("x-razorpay-event-id", eventId)
        .set("Content-Type", "application/json")
        .send(raw);
      expect(first.status).toBe(201);

      const sub = await request(app.getHttpServer())
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${otherToken}`);
      expect((sub.body.data ?? sub.body).status).toBe("ACTIVE");

      const duplicate = await request(app.getHttpServer())
        .post("/api/v1/billing/webhooks/razorpay")
        .set("x-razorpay-signature", signature)
        .set("x-razorpay-event-id", eventId)
        .set("Content-Type", "application/json")
        .send(raw);
      expect(duplicate.status).toBe(201);
      expect((duplicate.body.data ?? duplicate.body).duplicate).toBe(true);
    });

    it("rejects webhook with invalid signature", async () => {
      const payload = JSON.stringify({ event: "payment.captured", payload: {} });
      const res = await request(app.getHttpServer())
        .post("/api/v1/billing/webhooks/razorpay")
        .set("x-razorpay-signature", "bad-signature")
        .set("Content-Type", "application/json")
        .send(payload);
      expect(res.status).toBe(401);
    });
  });
});
