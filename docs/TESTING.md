# Testing

**Audience:** Engineers  
**Last updated:** July 2026

## Commands

| Command | Scope |
|---------|-------|
| `npm run test:unit` | API unit tests |
| `npm run test:security` | Isolation and auth e2e patterns |
| `npm run test:e2e` | Full API e2e |
| `npm run test:release-flow` | Release-flow e2e subset |
| `npm run verify:release` | Release readiness script |
| Shared specs | `packages/shared/src/*.spec.ts` (permissions, navigation, password policy) |

## Layout

API tests use Jest configs under `apps/api/`:

- `jest-unit.json` — unit tests
- `test/jest-e2e.json` — e2e / security suites
- `test/setup-env.ts` — test environment

## Guidance

Prefer adding isolation tests when introducing new tenant-owned resources.

## Tech used

Jest (API), TypeScript specs in `@velon/shared`. See [Tech stack — Tooling](./TECH-STACK.md#10-tooling-and-quality).

## Related docs

- [Security](./SECURITY.md)
- [Multi-tenancy](./MULTI-TENANCY.md)
- [Conventions](./CONVENTIONS.md)
