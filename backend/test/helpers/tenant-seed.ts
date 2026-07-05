import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { IndustryTemplate, PrismaClient, UserRole, type Tenant, type User } from '@velon/database';

const prisma = new PrismaClient();

export type SeededTenant = {
  tenant: Tenant;
  user: User;
  workspaceId: string;
  membershipId: string;
  password: string;
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'tenant'
  );
}

export async function seedTenantUser(input: {
  email: string;
  companyName: string;
  password?: string;
  seedSource?: string;
}): Promise<SeededTenant> {
  const email = input.email.toLowerCase();
  const password = input.password ?? 'TestPass123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const slug = `${slugify(input.companyName)}-${crypto.randomBytes(2).toString('hex')}`;
  const renewal = new Date();
  renewal.setDate(renewal.getDate() + 30);
  const seedSource = input.seedSource ?? 'e2e';

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: 'Test Owner',
        role: UserRole.USER,
        seedSource,
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        name: input.companyName,
        slug,
        tenantCode: `TNT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        country: 'India',
        industryTemplate: IndustryTemplate.SERVICES,
        renewalDate: renewal,
        seedSource,
      },
    });

    await tx.companyProfile.create({
      data: {
        tenantId: tenant.id,
        legalName: input.companyName,
        email,
        phone: '+91 9999999999',
        country: 'India',
        industry: IndustryTemplate.SERVICES,
      },
    });

    const workspace = await tx.workspace.create({
      data: {
        tenantId: tenant.id,
        name: input.companyName,
        slug: `${slug}-ws`,
      },
    });

    const membership = await tx.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: UserRole.TENANT_OWNER,
        isActive: true,
      },
    });

    return { tenant, user, workspaceId: workspace.id, membershipId: membership.id };
  });

  return { ...result, password };
}

export async function cleanupTenantUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return;
  const memberships = await prisma.tenantMembership.findMany({ where: { userId: user.id } });
  for (const m of memberships) {
    await prisma.tenantCustomer.deleteMany({ where: { tenantId: m.tenantId } });
    await prisma.tenantProject.deleteMany({ where: { tenantId: m.tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId: m.tenantId } });
    await prisma.companyProfile.deleteMany({ where: { tenantId: m.tenantId } });
    await prisma.workspace.deleteMany({ where: { tenantId: m.tenantId } });
    await prisma.tenantMembership.deleteMany({ where: { tenantId: m.tenantId } });
    await prisma.tenant.delete({ where: { id: m.tenantId } });
  }
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

export async function disconnectTestDb() {
  await prisma.$disconnect();
}

export { prisma };
