import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CrmLeadStatus,
  CrmOpportunityStatus,
  CrmQuotationStatus,
  InvitationStatus,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  SupplierStatus,
} from '@velon/database';
import { canReadInventory, normalizeVelonRole, planCatalogEntry } from '@velon/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SeatsService } from '../tenant-admin/seats.service';
import { WorkspaceContextService } from './workspace-context.service';

type PosSaleAuditMeta = {
  total?: number;
  lineCount?: number;
  inventoryRowsTouched?: number;
  customerName?: string;
  lines?: Array<{ name: string; qty: number; unitPrice: number }>;
};

/** Tenant-scoped workspace readiness data — company, subscription, team, activity. */
@Injectable()
export class WorkspaceDataService {
  constructor(
    private readonly workspaceContext: WorkspaceContextService,
    private readonly seats: SeatsService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  private monthStart(): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parsePosMeta(metadata: unknown): PosSaleAuditMeta {
    if (!metadata || typeof metadata !== 'object') return {};
    return metadata as PosSaleAuditMeta;
  }

  private async posSalesAudit(tenantId: string, since?: Date) {
    return this.prisma.client.auditLog.findMany({
      where: {
        tenantId,
        action: { in: ['pos.sale_paid', 'pos.sale_due'] },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private summarizePosSales(rows: Awaited<ReturnType<typeof this.posSalesAudit>>) {
    let paidMtd = 0;
    let dueMtd = 0;
    let revenueMtd = 0;
    const invoices = rows.map((row) => {
      const meta = this.parsePosMeta(row.metadata);
      const amount = Number(meta.total ?? 0);
      const paid = row.action === 'pos.sale_paid';
      if (paid) paidMtd += amount;
      else dueMtd += amount;
      revenueMtd += amount;
      return {
        id: row.entityId ?? row.id,
        customer: meta.customerName ?? 'Walk-in',
        amount,
        status: paid ? ('paid' as const) : ('due' as const),
        date: row.createdAt.toISOString().slice(0, 10),
        at: row.createdAt.toISOString(),
        lineCount: meta.lineCount ?? 0,
      };
    });
    return { paidMtd, dueMtd, revenueMtd, invoices };
  }

  async dashboard(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    const tenantId = ctx.tenantId;

    const userId = ctx.user.id;
    const [
      seats,
      departmentCount,
      activeUsers,
      pendingInvites,
      notifications,
      recentActivity,
      crmCustomers,
      crmLeads,
      crmOpenOpportunities,
      crmOpenQuotations,
      crmActivities,
      inventoryProducts,
      inventoryWarehouses,
      inventoryStocks,
      pendingPurchaseRequests,
      pendingPurchaseOrders,
    ] = await Promise.all([
      this.seats.getSeatSummary(tenantId),
      this.prisma.client.department.count({ where: { tenantId } }),
      this.prisma.client.tenantMembership.count({
        where: { tenantId, isActive: true, user: { isActive: true } },
      }),
      this.prisma.client.tenantInvitation.count({
        where: { tenantId, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
      }),
      this.prisma.client.notification.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.audit.listRecent(10, tenantId),
      this.prisma.client.crmCustomer.count({ where: { tenantId, archivedAt: null } }),
      this.prisma.client.crmLead.count({
        where: {
          tenantId,
          archivedAt: null,
          status: { notIn: [CrmLeadStatus.CONVERTED, CrmLeadStatus.DISQUALIFIED] },
        },
      }),
      this.prisma.client.crmOpportunity.count({
        where: { tenantId, status: CrmOpportunityStatus.OPEN },
      }),
      this.prisma.client.crmQuotation.count({
        where: {
          tenantId,
          status: {
            in: [CrmQuotationStatus.DRAFT, CrmQuotationStatus.SENT, CrmQuotationStatus.VIEWED],
          },
        },
      }),
      this.prisma.client.crmActivity.count({ where: { tenantId } }),
      this.prisma.client.inventoryProduct.count({ where: { tenantId } }),
      this.prisma.client.inventoryWarehouse.count({ where: { tenantId, isActive: true } }),
      this.prisma.client.inventoryStock.findMany({ where: { tenantId } }),
      this.prisma.client.purchaseRequest.count({
        where: { tenantId, status: PurchaseRequestStatus.PENDING_APPROVAL },
      }),
      this.prisma.client.purchaseOrder.count({
        where: {
          tenantId,
          status: { in: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING_APPROVAL] },
        },
      }),
    ]);

    const lowStockAlerts = inventoryStocks.filter(
      (s) => s.quantity - s.reservedQty <= s.reorderLevel,
    ).length;

    const plan = planCatalogEntry(ctx.tenant.plan);

    return {
      company: {
        name: ctx.companyProfile?.legalName ?? ctx.tenant.name,
        email: ctx.companyProfile?.email ?? null,
        phone: ctx.companyProfile?.phone ?? null,
        country: ctx.companyProfile?.country ?? null,
        industry: ctx.companyProfile?.industry ?? null,
        address: ctx.companyProfile?.address ?? null,
        website: ctx.companyProfile?.website ?? null,
        taxId: ctx.companyProfile?.taxId ?? null,
        logoDataUrl: ctx.companyProfile?.logoDataUrl ?? null,
      },
      workspace: {
        name: ctx.workspace.name,
        slug: ctx.workspace.slug,
        timezone: ctx.workspace.timezone,
        countryCode: ctx.workspace.countryCode,
        currency: ctx.workspace.currency,
        currencySymbol: ctx.workspace.currencySymbol,
        dateFormat: ctx.workspace.dateFormat,
        numberFormat: ctx.workspace.numberFormat,
        language: ctx.workspace.language,
      },
      subscription: {
        plan: ctx.tenant.plan,
        planDisplayName: plan.displayName,
        status: ctx.tenant.status,
        renewalDate: ctx.tenant.renewalDate.toISOString().slice(0, 10),
        seatLimit: plan.seatLimit,
        monthlyPrice: plan.monthlyPrice,
      },
      seats: {
        used: seats.activeSeats,
        limit: seats.limit,
        remaining: seats.remaining,
        unlimited: seats.unlimited,
        pendingInvites,
      },
      team: {
        activeUsers,
        departments: departmentCount,
      },
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        at: a.createdAt.toISOString(),
        actorEmail: a.actor?.email ?? null,
        actorName: a.actor?.name ?? null,
      })),
      crmSummary: {
        customers: crmCustomers,
        leads: crmLeads,
        openOpportunities: crmOpenOpportunities,
        openQuotations: crmOpenQuotations,
        activities: crmActivities,
      },
      inventorySummary: {
        totalProducts: inventoryProducts,
        lowStockAlerts,
        pendingPurchaseRequests,
        pendingPurchaseOrders,
        warehouseCount: inventoryWarehouses,
      },
      quickActions: [
        {
          label: 'Invite team member',
          to: '/app/settings/admin',
          search: { section: 'invitations', tab: 'general' },
        },
        {
          label: 'Create department',
          to: '/app/settings/admin',
          search: { section: 'departments', tab: 'general' },
        },
        {
          label: 'Add user',
          to: '/app/settings/admin',
          search: { section: 'users', tab: 'general' },
        },
        { label: 'Open CRM', to: '/app/crm', search: { section: 'customers' } },
        { label: 'Inventory', to: '/app/inventory' },
        { label: 'Procurement', to: '/app/procurement' },
        {
          label: 'Company settings',
          to: '/app/settings/admin',
          search: { section: 'company', tab: 'general' },
        },
      ],
    };
  }

  async navBadges(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    const unread = await this.prisma.client.notification.count({
      where: { tenantId: ctx.tenantId, userId: ctx.user.id, read: false },
    });
    return { billingOpen: 0, alerts: unread };
  }

  async alerts(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    const rows = await this.prisma.client.notification.findMany({
      where: { tenantId: ctx.tenantId, userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async markNotificationRead(
    user: Parameters<WorkspaceContextService['resolve']>[0],
    notificationId: string,
  ) {
    const ctx = await this.workspaceContext.resolve(user);
    const result = await this.prisma.client.notification.updateMany({
      where: { id: notificationId, tenantId: ctx.tenantId, userId: ctx.user.id },
      data: { read: true },
    });
    if (result.count === 0) throw new NotFoundException('Notification not found.');
    return { ok: true };
  }

  async markAllNotificationsRead(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    await this.prisma.client.notification.updateMany({
      where: { tenantId: ctx.tenantId, userId: ctx.user.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  }

  async customers(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    const rows = await this.prisma.client.crmCustomer.findMany({
      where: { tenantId: ctx.tenantId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    const posRows = await this.posSalesAudit(ctx.tenantId);
    const pos = this.summarizePosSales(posRows);

    const customers = rows.map((c) => ({
      id: c.id,
      name: c.companyName,
      outstandingDue:
        Math.round(
          pos.invoices
            .filter((i) => i.status === 'due' && i.customer === c.companyName)
            .reduce((s, i) => s + i.amount, 0) * 100,
        ) / 100,
      status: 'active' as const,
      email: c.email ?? '',
      phone: c.phone ?? '',
      accountManager: '',
      creditLimit: 0,
      lifetimeValue:
        Math.round(
          pos.invoices
            .filter((i) => i.customer === c.companyName)
            .reduce((s, i) => s + i.amount, 0) * 100,
        ) / 100,
      openOpportunities: 0,
      winRatePct: 0,
      healthScore: c.status === 'ACTIVE' ? 80 : 50,
    }));
    return {
      customers,
      activities: [],
      invoices: pos.invoices,
      kpis: {
        totalCustomers: customers.length,
        overdueExposure: 0,
        openArLines: 0,
        avgHealth: customers.length
          ? Math.round(customers.reduce((s, c) => s + c.healthScore, 0) / customers.length)
          : 0,
      },
      alerts: [],
    };
  }

  async suppliers(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    const [supplierRows, poRows, threadRows] = await Promise.all([
      this.prisma.client.supplier.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.client.purchaseOrder.findMany({
        where: {
          tenantId: ctx.tenantId,
          status: {
            in: [
              PurchaseOrderStatus.DRAFT,
              PurchaseOrderStatus.PENDING_APPROVAL,
              PurchaseOrderStatus.APPROVED,
              PurchaseOrderStatus.SENT,
              PurchaseOrderStatus.PARTIALLY_RECEIVED,
            ],
          },
        },
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.client.supplierThread.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const suppliers = supplierRows.map((s) => ({
      id: s.id,
      name: s.name,
      outstanding: 0,
      paymentStatus: s.status === SupplierStatus.ACTIVE ? 'paid' : 'due in 3 days',
      email: s.email ?? '',
      region: s.country ?? '',
      category: 'General',
      lifecycle: (s.status === SupplierStatus.ONBOARDING
        ? 'onboarding'
        : s.status === SupplierStatus.ACTIVE
          ? 'active'
          : 'inactive') as 'active' | 'onboarding' | 'inactive',
      onTimeDeliveryPct: 0,
      qualityScore: 0,
      riskTier: 'low' as const,
      annualSpend: 0,
      primaryCatalog: s.legalName ?? s.name,
    }));

    const purchaseOrders = poRows.map((po) => ({
      id: po.id,
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      poNumber: po.poNumber,
      stage: po.status.toLowerCase().replace(/_/g, '-') as
        | 'draft'
        | 'sent'
        | 'partial'
        | 'received'
        | 'invoiced',
      amount: Number(po.total),
      total: Number(po.total),
      currency: ctx.workspace.currency,
      dueDate: po.createdAt.toISOString().slice(0, 10),
      expectedDate: po.createdAt.toISOString().slice(0, 10),
      label: `${po.poNumber} · ${po.supplier.name}`,
    }));

    const activeSuppliers = supplierRows.filter((s) => s.status === SupplierStatus.ACTIVE).length;

    const threads = threadRows.map((t) => ({
      id: t.id,
      supplierId: t.supplierId,
      at: t.createdAt.toISOString(),
      author: t.authorName,
      body: t.body,
    }));

    return {
      suppliers,
      purchaseOrders,
      threads,
      kpis: {
        activeSuppliers,
        partnersInNetwork: supplierRows.length,
        openPayables: 0,
        openPoPipeline: poRows.length,
        avgOnTimePct: 0,
        suppliersAtRisk: supplierRows.filter((s) => s.status !== SupplierStatus.ACTIVE).length,
      },
      alerts: [],
    };
  }

  async salesCrm(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    const tenantId = ctx.tenantId;
    const monthStart = this.monthStart();

    const [leads, openOpps, openQuotes, stocks, posRows, crmCustomers, leadRows] =
      await Promise.all([
        this.prisma.client.crmLead.count({
          where: {
            tenantId,
            archivedAt: null,
            status: { notIn: [CrmLeadStatus.CONVERTED, CrmLeadStatus.DISQUALIFIED] },
          },
        }),
        this.prisma.client.crmOpportunity.findMany({
          where: { tenantId, status: CrmOpportunityStatus.OPEN },
          select: { value: true },
        }),
        this.prisma.client.crmQuotation.count({
          where: {
            tenantId,
            status: {
              in: [CrmQuotationStatus.DRAFT, CrmQuotationStatus.SENT, CrmQuotationStatus.VIEWED],
            },
          },
        }),
        this.prisma.client.inventoryStock.findMany({ where: { tenantId } }),
        this.posSalesAudit(tenantId, monthStart),
        this.prisma.client.crmCustomer.findMany({
          where: { tenantId, archivedAt: null },
          take: 24,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.client.crmLead.findMany({
          where: {
            tenantId,
            archivedAt: null,
            status: { notIn: [CrmLeadStatus.CONVERTED, CrmLeadStatus.DISQUALIFIED] },
          },
          orderBy: { updatedAt: 'desc' },
          take: 48,
        }),
      ]);

    const pos = this.summarizePosSales(posRows);
    const pipelineValueOpen = openOpps.reduce((s, o) => s + Number(o.value ?? 0), 0);
    const lowStockSkus = stocks.filter((s) => s.quantity - s.reservedQty <= s.reorderLevel).length;

    const mapLeadStage = (status: CrmLeadStatus): 'New' | 'Qualified' | 'Proposal' | 'Won' => {
      switch (status) {
        case CrmLeadStatus.QUALIFIED:
          return 'Qualified';
        case CrmLeadStatus.CONTACTED:
          return 'Qualified';
        default:
          return 'New';
      }
    };

    return {
      stageCounts: {
        New: leads,
        Qualified: 0,
        Proposal: openQuotes,
        Won: pos.invoices.filter((i) => i.status === 'paid').length,
      },
      leads: leadRows.map((row) => ({
        id: row.id,
        title: row.contactName ? `${row.companyName} — ${row.contactName}` : row.companyName,
        company: row.companyName,
        stage: mapLeadStage(row.status),
        estimatedValue: 0,
        customerId: row.convertedCustomerId ?? undefined,
        aiScore: 50,
        quoteStatus: 'none' as const,
        owner: 'Workspace',
        nextStep: row.notes?.slice(0, 80) ?? 'Follow up',
        nextStepDue: row.updatedAt.toISOString().slice(0, 10),
      })),
      activities: [],
      customers: crmCustomers.map((c) => ({
        id: c.id,
        name: c.companyName,
        email: c.email ?? '',
        status: 'active' as const,
      })),
      invoices: pos.invoices.map((i) => ({
        id: i.id,
        customer: i.customer,
        amount: i.amount,
        status: i.status,
        date: i.date,
      })),
      inventoryHealth: { lowStockSkus, spotlightLines: [] },
      kpis: {
        openDeals: openOpps.length,
        pipelineValueOpen,
        avgDealOpen: openOpps.length ? Math.round(pipelineValueOpen / openOpps.length) : 0,
        wonValueAll: Math.round(pos.paidMtd * 100) / 100,
        monthlyGoal: Math.round(pos.revenueMtd * 1.2 * 100) / 100 || 10000,
        goalProgressPct:
          pos.revenueMtd > 0
            ? Math.min(100, Math.round((pos.paidMtd / (pos.revenueMtd * 1.2 || 1)) * 100))
            : 0,
        pendingQuotes: openQuotes,
        hotLeads: leads,
      },
      tasksToday: [],
      aiInsights: [],
    };
  }

  async accounting(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    const tenantId = ctx.tenantId;
    const monthStart = this.monthStart();

    const [customers, stocks, openPoRows, suppliers, posRows, recentAudit] = await Promise.all([
      this.prisma.client.crmCustomer.count({ where: { tenantId, archivedAt: null } }),
      this.prisma.client.inventoryStock.findMany({
        where: { tenantId },
        include: { product: true },
      }),
      this.prisma.client.purchaseOrder.findMany({
        where: {
          tenantId,
          status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED'] },
        },
        select: { total: true },
      }),
      this.prisma.client.supplier.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.posSalesAudit(tenantId, monthStart),
      this.prisma.client.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { actor: { select: { email: true, name: true } } },
      }),
    ]);

    const pos = this.summarizePosSales(posRows);
    const payables =
      Math.round(openPoRows.reduce((sum, po) => sum + Number(po.total), 0) * 100) / 100;
    const inventoryValue = stocks.reduce(
      (sum, row) => sum + (row.quantity - row.reservedQty) * Number(row.product.unitPrice),
      0,
    );
    const cogsMtd = Math.round(pos.revenueMtd * 0.55 * 100) / 100;
    const netOperating = Math.round((pos.revenueMtd - cogsMtd - payables * 0.1) * 100) / 100;

    const cashByDay = new Map<string, { inflow: number; outflow: number }>();
    for (const inv of pos.invoices) {
      const day = inv.date;
      const cur = cashByDay.get(day) ?? { inflow: 0, outflow: 0 };
      if (inv.status === 'paid') cur.inflow += inv.amount;
      else cur.outflow += inv.amount;
      cashByDay.set(day, cur);
    }
    const cashFlowTrend = [...cashByDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, inflow: v.inflow, outflow: v.outflow }));

    return {
      kpis: {
        cashbook: Math.round(pos.paidMtd * 100) / 100,
        expensesMtd: Math.round(payables * 0.15 * 100) / 100,
        receivables: Math.round(pos.dueMtd * 100) / 100,
        payables,
        recognizedRevenueMtd: Math.round(pos.revenueMtd * 100) / 100,
        cogsMtd,
        netOperating,
      },
      agingAr:
        pos.dueMtd > 0
          ? [{ bucket: 'POS tickets (due)', amount: Math.round(pos.dueMtd * 100) / 100 }]
          : [],
      agingAp: payables > 0 ? [{ bucket: 'Open POs', amount: payables }] : [],
      cashFlowTrend,
      automationAlerts: [],
      controlAlerts: [],
      invoices: pos.invoices.map((inv) => ({
        id: inv.id,
        customer: inv.customer,
        amt: inv.amount,
        status: inv.status === 'paid' ? ('Paid' as const) : ('Pending' as const),
        postedDate: inv.date,
        label: `${inv.id} · ${inv.customer}`,
      })),
      journalEntries: pos.invoices.map((inv) => {
        const amt = inv.amount;
        const paid = inv.status === 'paid';
        return {
          id: inv.id,
          postedDate: inv.date,
          memo: `POS ${inv.status} · ${inv.customer}`,
          sourceModule: 'sales' as const,
          sourceDocId: inv.id,
          postedBy: 'POS',
          lines: paid
            ? [
                { account: '1000 · Cash', debit: amt, credit: 0 },
                { account: '4000 · Sales revenue', debit: 0, credit: amt },
              ]
            : [
                { account: '1200 · Accounts receivable', debit: amt, credit: 0 },
                { account: '4000 · Sales revenue', debit: 0, credit: amt },
              ],
        };
      }),
      bankFeed: pos.invoices
        .filter((i) => i.status === 'paid')
        .map((i) => ({
          id: i.id,
          bookedDate: i.date,
          description: `POS cash · ${i.customer}`,
          amount: i.amount,
          matchStatus: 'matched' as const,
          matchedTo: i.id,
        })),
      apBills: openPoRows.length
        ? [
            {
              id: 'open-pos',
              supplierName: 'Suppliers',
              amount: payables,
              stage: 'scheduled' as const,
              dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
              reference: 'Open purchase orders',
            },
          ]
        : [],
      auditLog: recentAudit.map((a) => ({
        id: a.id,
        action: a.action,
        at: a.createdAt.toISOString(),
        actor: a.actor?.name ?? a.actor?.email ?? 'System',
        entityRef: a.entityId ?? a.entityType ?? '—',
      })),
      _live: {
        customerCount: customers,
        supplierCount: suppliers,
        stockSkus: stocks.length,
        posSalesMtd: pos.invoices.length,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
      },
    };
  }

  async reports(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const accounting = await this.accounting(user);
    const revenueMtd = accounting.kpis.recognizedRevenueMtd;
    const expensesMtd = accounting.kpis.expensesMtd;
    const netMarginPct =
      revenueMtd > 0 ? Math.round((accounting.kpis.netOperating / revenueMtd) * 100) : 0;

    return {
      kpis: {
        operatingCash: accounting.kpis.cashbook,
        netMarginPct,
        receivables: accounting.kpis.receivables,
        payables: accounting.kpis.payables,
        revenueMtd,
        expensesMtd,
        budgetVariancePct: 0,
      },
      alerts: accounting.controlAlerts,
      netCashSeries: accounting.cashFlowTrend.map((row) => ({
        period: row.period,
        net: Math.round((row.inflow - row.outflow) * 100) / 100,
      })),
      expenseMix: [
        { name: 'COGS', value: accounting.kpis.cogsMtd },
        { name: 'Payables', value: accounting.kpis.payables },
        { name: 'Operating', value: expensesMtd },
      ].filter((row) => row.value > 0),
      expenseDrill: [],
      taskQueues: {
        approvals: accounting.apBills.map((bill) => ({
          id: bill.id,
          title: bill.supplierName,
          subtitle: `${bill.reference} · ${bill.dueDate}`,
        })),
        reconciliations: [],
        journals: accounting.journalEntries.slice(0, 5).map((j) => ({
          id: j.id,
          title: j.memo,
        })),
      },
      annotations: accounting.auditLog.slice(0, 8).map((a) => ({
        id: a.id,
        label: a.action,
        at: a.at,
      })),
      catalog: accounting.invoices.slice(0, 12).map((inv) => ({
        id: inv.id,
        label: inv.label,
        amount: inv.amt,
        status: inv.status,
      })),
    };
  }

  async branches(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);
    const tenantId = ctx.tenantId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [warehouses, stocks, posMtdRows, posTodayRows] = await Promise.all([
      this.prisma.client.inventoryWarehouse.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.client.inventoryStock.findMany({
        where: { tenantId },
        include: { product: true },
      }),
      this.posSalesAudit(tenantId, this.monthStart()),
      this.posSalesAudit(tenantId, todayStart),
    ]);

    const posMtd = this.summarizePosSales(posMtdRows);
    const posToday = this.summarizePosSales(posTodayRows);

    const lowStockSkusNetwork = stocks.filter(
      (s) => s.quantity - s.reservedQty <= s.reorderLevel,
    ).length;
    const criticalSkusNetwork = stocks.filter(
      (s) => s.quantity - s.reservedQty <= s.minStock,
    ).length;

    const branches = warehouses.map((wh) => {
      const whStocks = stocks.filter((s) => s.warehouseId === wh.id);
      const lowStockSkus = whStocks.filter(
        (s) => s.quantity - s.reservedQty <= s.reorderLevel,
      ).length;
      const criticalSkus = whStocks.filter((s) => s.quantity - s.reservedQty <= s.minStock).length;
      const batchTrackedSkus = whStocks.filter((s) => s.product.batchTracked).length;
      const operationalStatus: 'healthy' | 'watch' | 'critical' =
        criticalSkus > 0 ? 'critical' : lowStockSkus > 0 ? 'watch' : 'healthy';

      return {
        id: wh.id,
        name: wh.name,
        code: wh.code,
        kind: 'store' as const,
        salesMtd: 0,
        operationalStatus,
        skusTracked: whStocks.length,
        lowStockSkus,
        criticalSkus,
        batchTrackedSkus,
        inventorySites: [wh.name],
        address: wh.location ?? '',
        phone: wh.phone ?? '',
        email: wh.email ?? '',
        manager: wh.managerName ?? '',
        isActive: wh.isActive,
        lines: whStocks.map((s) => {
          const available = s.quantity - s.reservedQty;
          const stockLevel =
            available <= s.minStock ? 'critical' : available <= s.reorderLevel ? 'low' : 'healthy';
          return {
            id: s.id,
            sku: s.product.sku,
            name: s.product.name,
            quantity: available,
            stockLevel,
            reorderPoint: s.reorderLevel,
            batchTracked: s.product.batchTracked,
            unitPrice: Number(s.product.unitPrice),
          };
        }),
      };
    });

    const storesInWatch = branches.filter(
      (b) => b.isActive && b.operationalStatus !== 'healthy',
    ).length;

    return {
      branches,
      tasks: [],
      alerts:
        criticalSkusNetwork > 0
          ? [`${criticalSkusNetwork} SKU(s) at or below minimum stock across the network.`]
          : lowStockSkusNetwork > 0
            ? [`${lowStockSkusNetwork} SKU(s) at or below reorder level.`]
            : [],
      kpis: {
        networkMtdSales: Math.round(posMtd.revenueMtd * 100) / 100,
        posLinkedSalesToday: Math.round(posToday.revenueMtd * 100) / 100,
        openTasks: 0,
        lowStockSkusNetwork,
        storesInWatch,
        branchCount: branches.filter((b) => b.isActive).length,
        totalSkus: stocks.length,
        lowStockSkus: lowStockSkusNetwork,
        criticalSkus: criticalSkusNetwork,
        salesMtdAll: Math.round(posMtd.revenueMtd * 100) / 100,
      },
    };
  }

  async inventory(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    if (!canReadInventory(normalizeVelonRole(user.role))) return [];
    const ctx = await this.workspaceContext.resolve(user);

    const stocks = await this.prisma.client.inventoryStock.findMany({
      where: { tenantId: ctx.tenantId },
      include: { product: true, warehouse: true },
      orderBy: { updatedAt: 'desc' },
    });

    return stocks.map((row) => {
      const available = row.quantity - row.reservedQty;
      const stockLevel =
        available <= row.minStock ? 'critical' : available <= row.reorderLevel ? 'low' : 'healthy';
      return {
        id: row.id,
        sku: row.product.sku,
        name: row.product.name,
        site: row.warehouse.name,
        quantity: available,
        stockLevel,
        safetyStock: row.minStock,
        reorderPoint: row.reorderLevel,
        abcClass: row.product.abcClass,
        velocity: row.product.velocity.toLowerCase(),
        batchTracked: row.product.batchTracked,
        variantParent: row.product.variantParent ?? undefined,
        unitPrice: Number(row.product.unitPrice),
      };
    });
  }

  async posBootstrap(user: Parameters<WorkspaceContextService['resolve']>[0]) {
    const ctx = await this.workspaceContext.resolve(user);

    const [stocks, variantProducts, crmCustomers] = await Promise.all([
      this.prisma.client.inventoryStock.findMany({
        where: { tenantId: ctx.tenantId, variantId: null },
        include: { product: true, warehouse: true },
        orderBy: { updatedAt: 'desc' },
        take: 48,
      }),
      this.prisma.client.inventoryProduct.findMany({
        where: { tenantId: ctx.tenantId, hasVariants: true, status: 'ACTIVE' },
        include: {
          variants: {
            where: { status: 'ACTIVE' },
            include: {
              stock: { include: { warehouse: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 24,
      }),
      this.prisma.client.crmCustomer.findMany({
        where: { tenantId: ctx.tenantId, archivedAt: null },
        select: { id: true, companyName: true },
        take: 24,
        orderBy: { companyName: 'asc' },
      }),
    ]);

    const catalog = stocks
      .filter((row) => !row.product.hasVariants && row.quantity - row.reservedQty > 0)
      .map((row) => ({
        id: row.id,
        inventoryId: row.id,
        productId: row.productId,
        sku: row.product.sku,
        name: row.product.name,
        site: row.warehouse.name,
        unitPrice: Number(row.product.unitPrice),
        available: row.quantity - row.reservedQty,
        hasVariants: false,
      }));

    const variantCatalog = variantProducts
      .filter((p) => p.variants.length > 0)
      .map((p) => ({
        id: p.id,
        productId: p.id,
        name: p.name,
        imageDataUrl: p.imageDataUrl,
        variantCount: p.variants.length,
        hasVariants: true,
        variants: p.variants
          .map((v) => {
            const stockRow = v.stock.find((s) => s.quantity - s.reservedQty > 0) ?? v.stock[0];
            const available = stockRow ? stockRow.quantity - stockRow.reservedQty : 0;
            const unitPrice = Number(v.unitPrice);
            const salePrice = v.salePrice != null ? Number(v.salePrice) : null;
            const effectivePrice = salePrice != null && salePrice >= 0 ? salePrice : unitPrice;
            return {
              id: v.id,
              variantId: v.id,
              inventoryId: stockRow?.id,
              label: v.label,
              sku: v.sku,
              unitPrice: effectivePrice,
              available,
              site: stockRow?.warehouse.name,
            };
          })
          .filter((v) => v.available > 0 && v.inventoryId),
      }))
      .filter((p) => p.variants.length > 0);

    const customers = crmCustomers.map((c) => ({ id: c.id, name: c.companyName }));

    return {
      catalog,
      variantCatalog,
      recentTickets: [],
      customers,
      defaultTicket: [],
    };
  }

  async commitPosSale(
    user: Parameters<WorkspaceContextService['resolve']>[0],
    input: {
      lines: Array<{ inventoryId?: string; name: string; qty: number; unitPrice: number }>;
      kind: 'paid' | 'due';
      customerName?: string;
    },
    meta?: { ip?: string; ua?: string },
  ) {
    const ctx = await this.workspaceContext.resolve(user);
    const tenantId = ctx.tenantId;

    if (!input.lines.length) {
      throw new BadRequestException('Add at least one line to the ticket before settling.');
    }

    let total = 0;
    let inventoryRowsTouched = 0;
    const stockUpdates: Array<{ id: string; nextQty: number; name: string }> = [];

    for (const line of input.lines) {
      total += line.qty * line.unitPrice;
      if (!line.inventoryId) continue;

      const row = await this.prisma.client.inventoryStock.findFirst({
        where: { id: line.inventoryId, tenantId },
      });
      if (!row) continue;

      const nextQty = row.quantity - line.qty;
      if (nextQty < 0) {
        throw new BadRequestException(`Insufficient stock for ${line.name}.`);
      }
      stockUpdates.push({ id: row.id, nextQty, name: line.name });
      inventoryRowsTouched += 1;
    }

    const invoiceId = `POS-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    const roundedTotal = Math.round(total * 100) / 100;

    if (stockUpdates.length > 0) {
      await this.prisma.client.$transaction(
        stockUpdates.map((u) =>
          this.prisma.client.inventoryStock.update({
            where: { id: u.id },
            data: { quantity: u.nextQty },
          }),
        ),
      );
    }

    await this.audit.log({
      actorId: ctx.user.id,
      tenantId,
      action: input.kind === 'paid' ? 'pos.sale_paid' : 'pos.sale_due',
      entityType: 'pos_ticket',
      entityId: invoiceId,
      metadata: {
        total: roundedTotal,
        lineCount: input.lines.length,
        inventoryRowsTouched,
        customerName: input.customerName ?? 'Walk-in',
        lines: input.lines.map((l) => ({
          name: l.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
        })),
      },
      ipAddress: meta?.ip,
      userAgent: meta?.ua,
    });

    return { invoiceId, total: roundedTotal, inventoryRowsTouched };
  }
}
