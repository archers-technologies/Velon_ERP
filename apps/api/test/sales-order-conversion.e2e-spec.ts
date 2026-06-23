import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from "./helpers/tenant-seed";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("Sales order conversion (Phase 6A Sprint 1)", () => {
  let app: INestApplication;
  let tokenA = "";
  let tokenB = "";
  let customerAId = "";
  let quotationAId = "";
  let salesOrderAId = "";
  let ownerPassword = "";
  const emailA = `sales-a-${Date.now()}@sales.test`;
  const emailB = `sales-b-${Date.now()}@sales.test`;

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://127.0.0.1:6379";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seededA = await seedTenantUser({ email: emailA, companyName: "Sales Corp A" });
    ownerPassword = seededA.password;
    await seedTenantUser({ email: emailB, companyName: "Sales Corp B" });

    const loginA = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emailA, password: ownerPassword });
    tokenA = (loginA.body.data ?? loginA.body).accessToken;

    const loginB = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: emailB, password: ownerPassword });
    tokenB = (loginB.body.data ?? loginB.body).accessToken;
  });

  afterAll(async () => {
    await cleanupTenantUser(emailA);
    await cleanupTenantUser(emailB);
    await app?.close();
    await disconnectTestDb();
  });

  it("creates customer and quotation with line items", async () => {
    const cust = await request(app.getHttpServer())
      .post("/api/v1/crm/customers")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ companyName: "Acme Retail", email: "acme@test.com", status: "ACTIVE" });
    expect(cust.status).toBe(201);
    customerAId = (cust.body.data ?? cust.body).id;

    const qtn = await request(app.getHttpServer())
      .post("/api/v1/crm/quotations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ customerId: customerAId, scopeOfWork: "Product bundle" });
    expect(qtn.status).toBe(201);
    const qBody = qtn.body.data ?? qtn.body;
    quotationAId = qBody.id;

    const item = await request(app.getHttpServer())
      .post("/api/v1/crm/quotation-items")
      .query({ quotationId: quotationAId })
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ itemName: "Widget Pro", quantity: 4, unitPrice: 250, taxRate: 10 });
    expect(item.status).toBe(201);
  });

  it("approves quotation", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/crm/quotations/${quotationAId}/approve`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({});
    expect(res.status).toBe(201);
    expect((res.body.data ?? res.body).status).toBe("APPROVED");
  });

  it("converts approved quotation to sales order with matching totals", async () => {
    const qBefore = await request(app.getHttpServer())
      .get(`/api/v1/crm/quotations/${quotationAId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    const quotation = qBefore.body.data ?? qBefore.body;

    const convert = await request(app.getHttpServer())
      .post(`/api/v1/sales/orders/from-quotation/${quotationAId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(convert.status).toBe(201);

    const order = convert.body.data ?? convert.body;
    salesOrderAId = order.id;

    expect(order.orderNumber).toMatch(/^SO-\d{4}-\d{6}$/);
    expect(order.status).toBe("DRAFT");
    expect(order.quotationId).toBe(quotationAId);
    expect(order.customerId).toBe(customerAId);
    expect(Number(order.subtotal)).toBe(Number(quotation.subtotal));
    expect(Number(order.taxAmount)).toBe(Number(quotation.tax));
    expect(Number(order.total)).toBe(Number(quotation.total));
    expect(order.items.length).toBeGreaterThan(0);
    expect(order.items[0].description).toContain("Widget Pro");
  });

  it("links quotation to sales order and lists order by id", async () => {
    const qAfter = await request(app.getHttpServer())
      .get(`/api/v1/crm/quotations/${quotationAId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    const quotation = qAfter.body.data ?? qAfter.body;
    expect(quotation.salesOrderId).toBe(salesOrderAId);

    const list = await request(app.getHttpServer())
      .get("/api/v1/sales/orders")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    const rows = list.body.data ?? list.body;
    expect(rows.find((r: { id: string }) => r.id === salesOrderAId)).toBeDefined();

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/sales/orders/${salesOrderAId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(detail.status).toBe(200);
    expect((detail.body.data ?? detail.body).id).toBe(salesOrderAId);
  });

  it("records audit log for conversion", async () => {
    const dash = await request(app.getHttpServer())
      .get("/api/v1/workspace/dashboard")
      .set("Authorization", `Bearer ${tokenA}`);
    const activity = (dash.body.data ?? dash.body).recentActivity as { action: string }[];
    expect(activity.some((a) => a.action === "sales.order_created_from_quotation")).toBe(true);
  });

  it("rejects duplicate conversion", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/sales/orders/from-quotation/${quotationAId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });

  it("tenant B cannot convert tenant A quotation", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/sales/orders/from-quotation/${quotationAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect([403, 404]).toContain(res.status);
  });

  it("tenant B cannot read tenant A sales order", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/v1/sales/orders")
      .set("Authorization", `Bearer ${tokenB}`);
    const rows = list.body.data ?? list.body;
    expect(rows.find((r: { id: string }) => r.id === salesOrderAId)).toBeUndefined();

    const getOne = await request(app.getHttpServer())
      .get(`/api/v1/sales/orders/${salesOrderAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(getOne.status).toBe(404);
  });
});
