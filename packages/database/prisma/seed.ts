import { resolve } from 'node:path';
import {
  IndustryTemplate,
  PrismaClient,
  TenantHealth,
  TenantPlan,
  TenantStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { canSeedDemoTenants } from '@velon/shared';

config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function seedPlanDefinitions() {
  const defaults = [
    {
      plan: TenantPlan.STARTER,
      displayName: 'Starter',
      monthlyPrice: 199,
      annualPrice: 1999,
      globalMonthlyPrice: 49,
      globalAnnualPrice: 539,
      currency: 'INR',
      seatLimit: 2,
      storageLimitGb: 10,
      invoiceLimitMo: 500,
      branchLimit: 1,
      trialDays: 14,
      moduleFinance: false,
      moduleManufacturing: false,
      description: 'For small shops, freelancers and new businesses.',
    },
    {
      plan: TenantPlan.GROWTH,
      displayName: 'Business',
      monthlyPrice: 399,
      annualPrice: 3999,
      globalMonthlyPrice: 149,
      globalAnnualPrice: 1639,
      currency: 'INR',
      seatLimit: 10,
      storageLimitGb: 50,
      invoiceLimitMo: 5000,
      branchLimit: 3,
      trialDays: 14,
      moduleFinance: true,
      moduleManufacturing: false,
      description: 'For growing retailers, wholesalers and service businesses.',
    },
    {
      plan: TenantPlan.ENTERPRISE,
      displayName: 'Professional',
      monthlyPrice: 699,
      annualPrice: 6999,
      globalMonthlyPrice: 499,
      globalAnnualPrice: 5489,
      currency: 'INR',
      seatLimit: 25,
      storageLimitGb: 500,
      invoiceLimitMo: null,
      branchLimit: 10,
      trialDays: 14,
      moduleFinance: true,
      moduleManufacturing: true,
      description: 'For established businesses needing more control.',
    },
  ] as const;

  for (const row of defaults) {
    await prisma.planDefinition.upsert({
      where: { plan: row.plan },
      update: {
        displayName: row.displayName,
        monthlyPrice: row.monthlyPrice,
        annualPrice: row.annualPrice,
        indiaMonthlyPrice: row.monthlyPrice,
        indiaAnnualPrice: row.annualPrice,
        globalMonthlyPrice: row.globalMonthlyPrice,
        globalAnnualPrice: row.globalAnnualPrice,
        seatLimit: row.seatLimit,
        branchLimit: row.branchLimit,
        description: row.description,
      },
      create: {
        plan: row.plan,
        displayName: row.displayName,
        monthlyPrice: row.monthlyPrice,
        annualPrice: row.annualPrice,
        currency: row.currency,
        indiaMonthlyPrice: row.monthlyPrice,
        indiaAnnualPrice: row.annualPrice,
        globalMonthlyPrice: row.globalMonthlyPrice,
        globalAnnualPrice: row.globalAnnualPrice,
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

async function seedDevTenant() {
  if (process.env.NODE_ENV === 'production') return;

  const email = process.env.DEV_TENANT_EMAIL?.trim().toLowerCase();
  const password = process.env.DEV_TENANT_PASSWORD;
  if (!email || !password) {
    console.log(
      'Skipping dev tenant — set DEV_TENANT_EMAIL and DEV_TENANT_PASSWORD in .env, then run npm run db:seed',
    );
    return;
  }

  const companyName = process.env.DEV_TENANT_COMPANY_NAME?.trim() || 'Velon Test Workspace';
  const passwordHash = await bcrypt.hash(password, 12);
  const slug = 'velon-test-workspace';
  const renewal = new Date();
  renewal.setDate(renewal.getDate() + 30);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, isActive: true, role: UserRole.USER, seedSource: 'seed' },
    });
    const membership = await prisma.tenantMembership.findFirst({
      where: { userId: existing.id, isActive: true },
    });
    if (membership) {
      console.log(`Dev tenant user updated: ${email}`);
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    const user =
      existing ??
      (await tx.user.create({
        data: {
          email,
          passwordHash,
          name: 'Test Tenant Owner',
          role: UserRole.USER,
          seedSource: 'seed',
        },
      }));

    if (existing) {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, isActive: true, role: UserRole.USER, seedSource: 'seed' },
      });
    }

    let tenant = await tx.tenant.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!tenant) {
      tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          tenantCode: 'TNT-DEV01',
          country: 'India',
          plan: TenantPlan.GROWTH,
          status: TenantStatus.ACTIVE,
          health: TenantHealth.HEALTHY,
          industryTemplate: IndustryTemplate.SERVICES,
          renewalDate: renewal,
          seedSource: 'seed',
        },
      });

      await tx.companyProfile.create({
        data: {
          tenantId: tenant.id,
          legalName: companyName,
          email,
          phone: '+91 9999999999',
          country: 'India',
          industry: IndustryTemplate.SERVICES,
        },
      });

      await tx.workspace.create({
        data: {
          tenantId: tenant.id,
          name: companyName,
          slug: `${slug}-ws`,
        },
      });
    }

    const membership = await tx.tenantMembership.findFirst({
      where: { userId: user.id, tenantId: tenant.id },
    });

    if (!membership) {
      await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: UserRole.TENANT_OWNER,
          isActive: true,
        },
      });
    } else if (!membership.isActive || membership.role !== UserRole.TENANT_OWNER) {
      await tx.tenantMembership.update({
        where: { id: membership.id },
        data: { role: UserRole.TENANT_OWNER, isActive: true },
      });
    }
  });

  console.log(`Dev tenant ready for local login: ${email}`);
}

async function main() {
  const superEmail = process.env.SUPER_ADMIN_EMAIL ?? 'info@velonerp.com';
  const superPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!superPassword) {
    throw new Error('SUPER_ADMIN_PASSWORD is required to seed the database.');
  }

  const passwordHash = await bcrypt.hash(superPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superEmail.toLowerCase() },
    update: { passwordHash, role: UserRole.SUPER_ADMIN, isActive: true, seedSource: null },
    create: {
      email: superEmail.toLowerCase(),
      passwordHash,
      name: 'Platform Super Admin',
      role: UserRole.SUPER_ADMIN,
      seedSource: null,
    },
  });

  await prisma.platformRevision.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', revision: 1 },
  });

  await seedPlanDefinitions();

  const tenantCount = await prisma.tenant.count({ where: { deletedAt: null } });
  if (tenantCount === 0 && canSeedDemoTenants()) {
    const renewal = new Date();
    renewal.setDate(renewal.getDate() + 30);
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Retail Co.',
        slug: 'demo-retail',
        tenantCode: 'TNT-DEMO1',
        country: 'India',
        plan: TenantPlan.GROWTH,
        status: TenantStatus.ACTIVE,
        health: TenantHealth.HEALTHY,
        industryTemplate: IndustryTemplate.RETAIL,
        usersCount: 12,
        mrr: 490,
        storageUsedGb: 8,
        storageCapGb: 120,
        renewalDate: renewal,
        seedSource: 'demo',
        companyProfile: {
          create: {
            legalName: 'Demo Retail Co.',
            email: 'demo@demo-retail.local',
            phone: '+91 00000 00000',
            country: 'India',
            industry: IndustryTemplate.RETAIL,
          },
        },
        workspace: {
          create: {
            name: 'Demo Retail Co.',
            slug: 'demo-retail-ws',
          },
        },
      },
    });
    console.log(`Demo tenant seeded (seedSource=demo): ${tenant.id}`);
  } else if (tenantCount === 0 && !canSeedDemoTenants()) {
    console.log('Skipping demo tenant — set SEED_DEMO_DATA=true in development to seed one.');
  }

  await seedDevTenant();

  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      action: 'platform.seeded',
      entityType: 'system',
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
