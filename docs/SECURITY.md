# Security

**Audience:** Engineers, security reviewers  
**Last updated:** July 2026

## Controls

| Control | Implementation |
|---------|----------------|
| Transport | HTTPS in production; Helmet on API |
| Auth secrets | Min length 32; placeholder values rejected in production |
| Passwords | bcrypt hashes; shared strength policy |
| Tokens | Short-lived access JWT; refresh tokens hashed at rest, revocable |
| OTP | Rate-limited; codes not returned in production responses |
| Input | ValidationPipe whitelist + forbid non-whitelisted |
| Tenant isolation | JWT + ALS + repository scoping; e2e isolation tests |
| Rate limits | Global throttler; stricter limits on auth endpoints |
| Subscription | Global guard limits access when past due / suspended |
| Demo data | Excluded from production admin metrics |

## Security tests

Security-focused Jest suites are run via `npm run test:security` (tenant isolation, auth hardening, permissions, billing, etc.).

## Tech used

Helmet, Passport JWT, bcrypt, otplib, Nest throttler, tenant-scoped repositories. See [Tech stack — Authentication and security](./TECH-STACK.md#6-authentication-and-security-stack).

## Related docs

- [Authentication](./AUTHENTICATION.md)
- [Multi-tenancy](./MULTI-TENANCY.md)
- [Testing](./TESTING.md)
- [Environment](./ENVIRONMENT.md)
