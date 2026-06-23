import {
  PrismaClient,
  UserRole,
  TenantPlan,
  TenantStatus,
  TenantHealth,
  IndustryTemplate,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { config } from "dotenv";
import { resolve } from "node:path";
import { canSeedDemoTenants } from "@velon/shared";

config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

async function seedPlanDefinitions() {
  const defaults = [
    {
      plan: TenantPlan.STARTER,
      displayName: "Starter",
      monthlyPrice: 49,
      annualPrice: 490,
      currency: "INR",
      seatLimit: 5,
      storageLimitGb: 10,
      invoiceLimitMo: 500,
      branchLimit: 1,
      trialDays: 14,
      moduleFinance: false,
      moduleManufacturing: false,
      description: "For small teams getting started with Velon ERP.",
    },
    {
      plan: TenantPlan.GROWTH,
      displayName: "Professional",
      monthlyPrice: 149,
      annualPrice: 1490,
      currency: "INR",
      seatLimit: 25,
      storageLimitGb: 50,
      invoiceLimitMo: 5000,
      branchLimit: 5,
      trialDays: 14,
      moduleFinance: true,
      moduleManufacturing: false,
      description: "For growing companies that need more seats and control.",
    },
    {
      plan: TenantPlan.ENTERPRISE,
      displayName: "Enterprise",
      monthlyPrice: 499,
      annualPrice: 4990,
      currency: "INR",
      seatLimit: null,
      storageLimitGb: 500,
      invoiceLimitMo: null,
      branchLimit: null,
      trialDays: 14,
      moduleFinance: true,
      moduleManufacturing: true,
      description: "Unlimited scale with dedicated support.",
    },
  ] as const;

  for (const row of defaults) {
    await prisma.planDefinition.upsert({
      where: { plan: row.plan },
      update: {},
      create: {
        plan: row.plan,
        displayName: row.displayName,
        monthlyPrice: row.monthlyPrice,
        annualPrice: row.annualPrice,
        currency: row.currency,
        seatLimit: row.seatLimit,
        storageLimitGb: row.storageLimitGb,
        invoiceLimitMo: row.invoiceLimitMo,
        branchLimit: row.branchLimit,
        trialDays: row.trialDays,
        isEnabled: true,
        moduleHrm: true,
        moduleCrm: true,
        moduleFinance: row.moduleFinance,
        moduleInventory: true,
        moduleManufacturing: row.moduleManufacturing,
        description: row.description,
      },
    });
  }
}

async function main() {
  const superEmail = process.env.SUPER_ADMIN_EMAIL ?? "info@velonerp.com";
  const superPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!superPassword) {
    throw new Error("SUPER_ADMIN_PASSWORD is required to seed the database.");
  }

  const passwordHash = await bcrypt.hash(superPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superEmail.toLowerCase() },
    update: { passwordHash, role: UserRole.SUPER_ADMIN, isActive: true, seedSource: null },
    create: {
      email: superEmail.toLowerCase(),
      passwordHash,
      name: "Platform Super Admin",
      role: UserRole.SUPER_ADMIN,
      seedSource: null,
    },
  });

  await prisma.platformRevision.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", revision: 1 },
  });

  await seedPlanDefinitions();

  const tenantCount = await prisma.tenant.count({ where: { deletedAt: null } });
  if (tenantCount === 0 && canSeedDemoTenants()) {
    const renewal = new Date();
    renewal.setDate(renewal.getDate() + 30);
    const tenant = await prisma.tenant.create({
      data: {
        name: "Demo Retail Co.",
        slug: "demo-retail",
        tenantCode: "TNT-DEMO1",
        country: "India",
        plan: TenantPlan.GROWTH,
        status: TenantStatus.ACTIVE,
        health: TenantHealth.HEALTHY,
        industryTemplate: IndustryTemplate.RETAIL,
        usersCount: 12,
        mrr: 490,
        storageUsedGb: 8,
        storageCapGb: 120,
        renewalDate: renewal,
        seedSource: "demo",
        companyProfile: {
          create: {
            legalName: "Demo Retail Co.",
            email: "demo@demo-retail.local",
            phone: "+91 00000 00000",
            country: "India",
            industry: IndustryTemplate.RETAIL,
          },
        },
        workspace: {
          create: {
            name: "Demo Retail Co.",
            slug: "demo-retail-ws",
          },
        },
      },
    });
    console.log(`Demo tenant seeded (seedSource=demo): ${tenant.id}`);
  } else if (tenantCount === 0 && !canSeedDemoTenants()) {
    console.log("Skipping demo tenant — set SEED_DEMO_DATA=true in development to seed one.");
  }

  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      action: "platform.seeded",
      entityType: "system",
      metadata: { superAdminEmail: superEmail },
    },
  });

  console.log(`Seed complete · super admin: ${superEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
