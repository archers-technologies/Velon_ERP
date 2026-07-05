import type { AuthScope } from "@velon/shared";
import {
  getAccessToken,
  getSessionScope as getStoredScope,
  type SessionRole,
} from "./session";
import { readTokenScope } from "./jwt-decode";

/** Resolve auth scope from JWT (API) or demo session — for portal routing only. */
export function resolveAuthScope(route: SessionRole): AuthScope | null {
  const stored = getStoredScope(route);
  if (stored) return stored;
  const token = getAccessToken(route);
  return readTokenScope(token);
}

export function hasPlatformPortalAccess(): boolean {
  return resolveAuthScope("admin") === "platform" && Boolean(getAccessToken("admin"));
}

export function hasTenantPortalAccess(): boolean {
  return resolveAuthScope("app") === "tenant" && Boolean(getAccessToken("app"));
}

export function isCrossPortalViolation(target: SessionRole): boolean {
  if (target === "admin") {
    return hasTenantPortalAccess() && !hasPlatformPortalAccess();
  }
  return hasPlatformPortalAccess() && !hasTenantPortalAccess();
}
