/**
 * Unit-test environment — no DATABASE_URL, no real Redis/SMTP.
 * Services under test receive injected mocks only.
 */
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test-jwt-access-secret-min-32-chars!!";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test-jwt-refresh-secret-min-32-chars!";
process.env.AUTH_OTP_SECRET = process.env.AUTH_OTP_SECRET ?? "test-auth-otp-secret-min-32-chars!!";

// Prevent accidental use of a live database URL in unit tests.
delete process.env.DATABASE_URL;
delete process.env.DATABASE_URL_TEST;
