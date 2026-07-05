import type { Prisma, PrismaClient } from '@velon/database';
import { isPlatformRole } from '@velon/shared';

type Db = PrismaClient | Prisma.TransactionClient;

/** Returns a user-facing reason when signup must be blocked, otherwise null. */
export async function signupEmailBlockReason(db: Db, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: { email: normalized },
    include: {
      memberships: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });
  if (!user) return null;
  if (isPlatformRole(user.role)) {
    return 'This email is registered to a platform account and cannot create a workspace.';
  }
  if (user.memberships.length > 0) {
    return 'This email is already registered. One email can own only one company workspace.';
  }
  return null;
}

/** Remove tenant users that no longer belong to any workspace (e.g. after tenant deletion). */
export async function cleanupUsersWithoutMemberships(db: Db, userIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  for (const userId of uniqueIds) {
    const membershipCount = await db.tenantMembership.count({
      where: { userId, isActive: true },
    });
    if (membershipCount > 0) continue;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || isPlatformRole(user.role)) continue;

    await db.refreshToken.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  }
}
