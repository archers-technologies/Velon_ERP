import { validateMongoEnvironment } from "../mongo/mongo.config";

const REQUIRED_IN_ALL_ENVS = ["DATABASE_URL", "REDIS_URL"] as const;
const REQUIRED_SECRETS = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "AUTH_OTP_SECRET"] as const;

const unsafeSecretValues = new Set([
  "",
  "change-me-access-secret-min-32-chars",
  "change-me-refresh-secret-min-32-chars",
  "dev-only-change-in-env",
  "change-me-otp-secret-min-32-chars",
]);

function read(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function requireEnv(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assertSafeSecret(name: string, value: string) {
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters.`);
  }
  if (process.env.NODE_ENV === "production" && unsafeSecretValues.has(value)) {
    throw new Error(`${name} is using a development placeholder.`);
  }
}

export function validateEnvironment(config: Record<string, unknown>) {
  for (const name of REQUIRED_IN_ALL_ENVS) {
    const value = String(config[name] ?? "").trim();
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
  }

  for (const name of REQUIRED_SECRETS) {
    const value = String(config[name] ?? "").trim();
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    assertSafeSecret(name, value);
  }

  validateMongoEnvironment(config);

  return config;
}

export function getApiPort(): number {
  return Number(read("PORT") ?? read("API_PORT") ?? 3001);
}

export function getJwtAccessSecret(): string {
  const value = requireEnv("JWT_ACCESS_SECRET");
  assertSafeSecret("JWT_ACCESS_SECRET", value);
  return value;
}

export function getAuthOtpSecret(): string {
  const value = requireEnv("AUTH_OTP_SECRET");
  assertSafeSecret("AUTH_OTP_SECRET", value);
  return value;
}

export function getRedisUrl(): string {
  return requireEnv("REDIS_URL");
}

const DEV_CORS_PORTS = new Set(["3000", "5173", "8080", "4173"]);

/** Private LAN hosts used when Vite prints a Network URL (e.g. 192.168.x.x:8080). */
function isDevLanOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    if (!DEV_CORS_PORTS.has(url.port)) return false;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
  } catch {
    return false;
  }
  return false;
}

export function getCorsOrigins(): string[] {
  const raw = read("CORS_ORIGINS");
  if (!raw) {
    return process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:8080", "http://localhost:3000"];
  }
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, "");
  const allowed = getCorsOrigins();
  if (allowed.includes("*") || allowed.includes(normalized)) return true;
  return isDevLanOrigin(normalized);
}
