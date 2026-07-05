import { canSeedDemoTenants } from '@velon/shared';

describe('production seed guards', () => {
  it('production mode does not seed demo tenants', () => {
    expect(canSeedDemoTenants({ NODE_ENV: 'production', VELON_SEED_DEMO_TENANTS: 'true' })).toBe(
      false,
    );
  });
});
