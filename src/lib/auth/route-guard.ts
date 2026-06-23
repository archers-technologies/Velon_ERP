import { redirect } from "@tanstack/react-router";
import { isAuthenticated, saveSession, type SessionRole, type StoredAuthScope } from "./session";
import { loginSearch } from "./login-utils";
import { hasPlatformPortalAccess, hasTenantPortalAccess, resolveAuthScope } from "./portal-access";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function denyWrongPortal(target: SessionRole): never {
  throw redirect({
    to: "/forbidden",
    search: { portal: target === "admin" ? "platform" : "workspace" },
  });
}

/** Auth checks use localStorage; skip on SSR and enforce on the client. */
export function requireWorkspaceAccess() {
  if (!isClient()) return;
  if (!isAuthenticated("app")) {
    throw redirect({ to: "/login", search: loginSearch() });
  }
  const scope = resolveAuthScope("app");
  if (scope !== "tenant") {
    denyWrongPortal("app");
  }
}

export function requireAdminAccess() {
  if (!isClient()) return;
  if (!isAuthenticated("admin")) {
    throw redirect({ to: "/platform/login" });
  }
  const scope = resolveAuthScope("admin");
  if (scope !== "platform") {
    denyWrongPortal("admin");
  }
}

export function redirectIfWorkspaceAuthenticated() {
  if (!isClient()) return;
  if (hasTenantPortalAccess()) {
    throw redirect({ to: "/app" });
  }
}

export function redirectIfAdminAuthenticated() {
  if (!isClient()) return;
  if (hasPlatformPortalAccess()) {
    throw redirect({ to: "/admin" });
  }
}

/** @deprecated Use redirectIfWorkspaceAuthenticated or redirectIfAdminAuthenticated */
export function redirectIfAuthenticated() {
  redirectIfWorkspaceAuthenticated();
}

export function saveDemoSession(role: SessionRole, email?: string) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  const scope: StoredAuthScope = role === "admin" ? "platform" : "tenant";
  saveSession({
    accessToken: `demo-access-${id}`,
    refreshToken: `demo-refresh-${id}`,
    route: role,
    email,
    scope,
  });
}
