import { IDS } from '../../../test/helpers/fixtures';
import { createMockPrisma } from '../../../test/helpers/mocks';
import { runWithTenantContext } from '../tenant-context.storage';
import { TenantScopedRepository } from './tenant-scoped.repository';

class TestRepo extends TenantScopedRepository {
  exposeTenantId() {
    return this.tenantId;
  }

  exposeWhere(extra?: Record<string, unknown>) {
    return this.where(extra);
  }
}

describe('TenantScopedRepository', () => {
  const repo = new TestRepo(createMockPrisma());

  it('requires active tenant context', () => {
    expect(() => repo.exposeTenantId()).toThrow(/Tenant context is not available/);
  });

  it('injects tenantId into every where clause', () => {
    runWithTenantContext(
      {
        tenantId: IDS.tenant,
        workspaceId: IDS.workspace,
        membershipId: IDS.membership,
        userId: IDS.owner,
      },
      () => {
        expect(repo.exposeTenantId()).toBe(IDS.tenant);
        expect(repo.exposeWhere({ id: 'row-1' })).toEqual({
          id: 'row-1',
          tenantId: IDS.tenant,
        });
        expect(repo.exposeWhere()).toEqual({ tenantId: IDS.tenant });
      },
    );
  });
});
