# Testing

**Audience:** Engineers  
**Last updated:** July 2026

## Commands

| Command                          | Scope                           | Touches your DB?              |
| -------------------------------- | ------------------------------- | ----------------------------- |
| `npm test` / `npm run test:unit` | Feature unit tests with mocks   | **No**                        |
| `npm run test:all`               | Unit + security e2e             | Security suite may            |
| `npm run test:security`          | Isolation and auth e2e patterns | Yes (use `DATABASE_URL_TEST`) |
| `npm run test:e2e`               | Full API e2e                    | Yes (use `DATABASE_URL_TEST`) |
| `npm run test:release-flow`      | Release-flow e2e subset         | Yes                           |
| `npm run verify:release`         | Release readiness script        | No                            |

Shared specs live in `packages/shared-kernel/src/*.spec.ts` (permissions, navigation, password policy, billing).

## Unit tests (safe default)

Unit tests exercise **service public APIs** with injected mocks for Prisma, Redis, mail, and repositories. They never open a real database connection for assertions.

- Setup: `backend/test/helpers/setup-unit.ts` (clears `DATABASE_URL`, sets JWT/OTP secrets)
- Fixtures: `backend/test/helpers/fixtures.ts` (test-only tenant/user IDs)
- Mocks: `backend/test/helpers/mocks.ts` (`createMockPrisma`, `createRepoMock`, …)

Coverage includes auth, CRM, inventory, sales, procurement, suppliers, billing access, seats, workspace context, tenants, platform, CMS, health, audit, and tenant resources.

## E2e / security tests

E2e suites under `backend/test/` write through the real API stack. Set `DATABASE_URL_TEST` to a **separate** Postgres database so local/dev data is not polluted. If unset, e2e warns and uses `DATABASE_URL`.

## Layout

API tests use Jest configs under `backend/`:

- `jest-unit.json` — unit tests (mocked boundaries)
- `test/jest-e2e.json` — e2e / security suites
- `test/setup-env.ts` — e2e environment

## Guidance

- Prefer unit tests with mocks for feature behavior and permissions.
- Prefer isolation e2e tests when introducing new tenant-owned resources.
- Assert observable outcomes (status, returned shape, thrown errors), not internal call graphs.

## Tech used

Jest (API), TypeScript specs in `@velon/shared`. See [Tech stack — Tooling](./TECH-STACK.md#10-tooling-and-quality).

## Related docs

- [Security](./SECURITY.md)
- [Multi-tenancy](./MULTI-TENANCY.md)
- [Conventions](./CONVENTIONS.md)
