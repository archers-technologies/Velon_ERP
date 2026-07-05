import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CrmLeadStatus } from "@velon/database";
import { CrmPipelineService } from "./crm-pipeline.service";
import { IDS, META, tenantOwner, tenantUser } from "../../test/helpers/fixtures";
import { createMockAudit, createRepoMock } from "../../test/helpers/mocks";

describe("CrmPipelineService", () => {
  const leads = createRepoMock(["findMany", "findById", "findByIdAny", "create", "update"]);
  const pipelines = createRepoMock([
    "findMany",
    "findById",
    "findDefault",
    "create",
    "update",
    "clearDefaultFlag",
    "count",
  ]);
  const stages = createRepoMock(["findMany", "findById", "create", "update", "delete", "reorder"]);
  const opportunities = createRepoMock([
    "findMany",
    "findById",
    "create",
    "update",
  ]);
  const customers = createRepoMock(["create"]);
  const audit = createMockAudit();

  let service: CrmPipelineService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CrmPipelineService(
      leads as never,
      pipelines as never,
      stages as never,
      opportunities as never,
      customers as never,
      audit as never,
    );
  });

  it("denies lead creation for read-only users", async () => {
    await expect(
      service.createLead(tenantUser(), { companyName: "X", contactName: "Y" }, META),
    ).rejects.toThrow(ForbiddenException);
  });

  describe("leads", () => {
    it("creates a lead with audit trail", async () => {
      leads.create.mockResolvedValue({
        id: IDS.lead,
        companyName: "Prospect Co",
        status: CrmLeadStatus.NEW,
      });
      const row = await service.createLead(
        tenantOwner(),
        { companyName: "Prospect Co", contactName: "Jane" },
        META,
      );
      expect(row.id).toBe(IDS.lead);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "crm.lead_created" }),
      );
    });

    it("converts an open lead into customer and opportunity", async () => {
      leads.findByIdAny.mockResolvedValue({
        id: IDS.lead,
        companyName: "Prospect Co",
        email: "j@example.test",
        phone: null,
        industry: null,
        notes: null,
        assignedToId: null,
        status: CrmLeadStatus.NEW,
      });
      pipelines.findById.mockResolvedValue({
        id: IDS.pipeline,
        stages: [{ id: IDS.stage, name: "Qualified", probability: 40 }],
      });
      customers.create.mockResolvedValue({ id: IDS.customer, companyName: "Prospect Co" });
      opportunities.create.mockResolvedValue({
        id: IDS.opportunity,
        title: "Prospect Co opportunity",
      });
      leads.update.mockResolvedValue({});

      const result = await service.convertLead(
        tenantOwner(),
        IDS.lead,
        { pipelineId: IDS.pipeline },
        META,
      );

      expect(result.customer.id).toBe(IDS.customer);
      expect(result.opportunity.id).toBe(IDS.opportunity);
      expect(leads.update).toHaveBeenCalledWith(
        IDS.lead,
        expect.objectContaining({
          status: CrmLeadStatus.CONVERTED,
          convertedCustomerId: IDS.customer,
          convertedOpportunityId: IDS.opportunity,
        }),
      );
    });

    it("rejects converting an already converted lead", async () => {
      leads.findByIdAny.mockResolvedValue({
        id: IDS.lead,
        status: CrmLeadStatus.CONVERTED,
      });
      await expect(service.convertLead(tenantOwner(), IDS.lead, {}, META)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("returns not found for missing lead", async () => {
      leads.findById.mockResolvedValue(null);
      await expect(service.getLead(tenantOwner(), "missing")).rejects.toThrow(NotFoundException);
    });
  });
});
