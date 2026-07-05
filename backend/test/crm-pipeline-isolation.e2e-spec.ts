import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from "./helpers/tenant-seed";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("CRM pipeline tenant isolation (Phase 3B)", () => {
  let app: INestApplication;
  let tokenA = "";
  let tokenB = "";
  let tenantAId = "";
  let leadAId = "";
  let opportunityAId = "";
  let pipelineAId = "";
  let ownerPassword = "";
  const emailA = `crm-pipe-a-${Date.now()}@crm.test`;
  const emailB = `crm-pipe-b-${Date.now()}@crm.test`;

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://127.0.0.1:6379";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const seededA = await seedTenantUser({ email: emailA, companyName: "Pipeline Corp A" });
    tenantAId = seededA.tenant.id;
    ownerPassword = seededA.password;
    await seedTenantUser({ email: emailB, companyName: "Pipeline Corp B" });

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

  it("seeds default pipeline via dashboard metrics", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/crm/dashboard-metrics")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.totalLeads).toBe(0);
    expect(body.openOpportunities).toBe(0);
  });

  it("creates lead for tenant A", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/crm/leads")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        companyName: "Prospect Co",
        contactName: "Alex",
        email: "alex@prospect.test",
        source: "WEBSITE",
        status: "QUALIFIED",
      });
    expect([200, 201]).toContain(res.status);
    const body = res.body.data ?? res.body;
    leadAId = body.id;
    expect(body.tenantId).toBe(tenantAId);
    expect(body.leadCode).toMatch(/^LED-/);
  });

  it("tenant B cannot read tenant A lead", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/v1/crm/leads")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(list.status).toBe(200);
    const rows = list.body.data ?? list.body;
    expect(rows.find((r: { id: string }) => r.id === leadAId)).toBeUndefined();

    const getOne = await request(app.getHttpServer())
      .get(`/api/v1/crm/leads/${leadAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(getOne.status).toBe(404);
  });

  it("lists pipelines and creates opportunity", async () => {
    const pipes = await request(app.getHttpServer())
      .get("/api/v1/crm/pipelines")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(pipes.status).toBe(200);
    const pipelineRows = pipes.body.data ?? pipes.body;
    expect(pipelineRows.length).toBeGreaterThan(0);
    pipelineAId = pipelineRows[0].id;
    const stageId = pipelineRows[0].stages.find((s: { name: string }) => s.name === "New")?.id
      ?? pipelineRows[0].stages[0].id;

    const opp = await request(app.getHttpServer())
      .post("/api/v1/crm/opportunities")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "Big deal",
        pipelineId: pipelineAId,
        stageId,
        value: 50000,
        probability: 20,
      });
    expect([200, 201]).toContain(opp.status);
    const body = opp.body.data ?? opp.body;
    opportunityAId = body.id;
    expect(body.tenantId).toBe(tenantAId);
  });

  it("tenant B cannot move tenant A opportunity stage", async () => {
    const pipesB = await request(app.getHttpServer())
      .get("/api/v1/crm/pipelines")
      .set("Authorization", `Bearer ${tokenB}`);
    const stageB = pipesB.body.data?.[0]?.stages?.[0]?.id ?? pipesB.body[0]?.stages?.[0]?.id;

    const move = await request(app.getHttpServer())
      .post(`/api/v1/crm/opportunities/${opportunityAId}/move-stage`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ stageId: stageB });
    expect(move.status).toBe(404);
  });

  it("converts qualified lead to customer and opportunity", async () => {
    const lead = await request(app.getHttpServer())
      .post("/api/v1/crm/leads")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ companyName: "Convert Me Ltd", status: "QUALIFIED" });
    const leadId = (lead.body.data ?? lead.body).id;

    const converted = await request(app.getHttpServer())
      .post(`/api/v1/crm/leads/${leadId}/convert`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Converted opp", value: 12000 });
    expect([200, 201]).toContain(converted.status);
    const body = converted.body.data ?? converted.body;
    expect(body.customer.id).toBeTruthy();
    expect(body.opportunity.id).toBeTruthy();
  });

  it("tenant B cannot see tenant A opportunities", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/v1/crm/opportunities")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(list.status).toBe(200);
    const rows = list.body.data ?? list.body;
    expect(rows.find((r: { id: string }) => r.id === opportunityAId)).toBeUndefined();
  });
});
