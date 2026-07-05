import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";

/** Jest setup — load env for integration tests */
config({ path: resolve(__dirname, "../../.env") });

/** Always run e2e as test — prevents real SMTP sends to *.test addresses from .env development mode. */
process.env.NODE_ENV = "test";

/** Use a dedicated test database when configured (recommended — avoids polluting local dev data). */
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
} else {
  console.warn(
    "[velon e2e] DATABASE_URL_TEST is not set — tests will write to DATABASE_URL and may pollute your dev database. Create a separate test DB and set DATABASE_URL_TEST in .env.",
  );
}

process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test-jwt-access-secret-min-32-chars!!";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test-jwt-refresh-secret-min-32-chars!";
process.env.AUTH_OTP_SECRET = process.env.AUTH_OTP_SECRET ?? "test-auth-otp-secret-min-32-chars!!";
