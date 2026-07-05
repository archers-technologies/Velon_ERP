const LEGACY_ACCESS_KEY = 'velon.accessToken';
const LEGACY_REFRESH_KEY = 'velon.refreshToken';
const LEGACY_ROLE_KEY = 'velon.role';
const LEGACY_EMAIL_KEY = 'velon.userEmail';

const ACCESS_KEYS = {
  admin: 'velon.admin.accessToken',
  app: 'velon.app.accessToken',
} as const;

const REFRESH_KEYS = {
  admin: 'velon.admin.refreshToken',
  app: 'velon.app.refreshToken',
} as const;

const EMAIL_KEYS = {
  admin: 'velon.admin.userEmail',
  app: 'velon.app.userEmail',
} as const;

const TENANT_ID_KEY = 'velon.app.tenantId';
const WORKSPACE_ID_KEY = 'velon.app.workspaceId';
const MEMBERSHIP_ROLE_KEY = 'velon.app.membershipRole';
const SCOPE_KEYS = {
  admin: 'velon.admin.scope',
  app: 'velon.app.scope',
} as const;

export type SessionRole = 'admin' | 'app';
export type StoredAuthScope = 'platform' | 'tenant';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

/** One-time migration from single-key session to scoped admin/app keys. */
function migrateLegacySession(): void {
  if (!isClient()) return;
  const legacyAccess = localStorage.getItem(LEGACY_ACCESS_KEY);
  if (!legacyAccess) return;

  const legacyRole = localStorage.getItem(LEGACY_ROLE_KEY);
  const route: SessionRole = legacyRole === 'admin' ? 'admin' : 'app';

  localStorage.setItem(ACCESS_KEYS[route], legacyAccess);
  const legacyRefresh = localStorage.getItem(LEGACY_REFRESH_KEY);
  if (legacyRefresh) {
    localStorage.setItem(REFRESH_KEYS[route], legacyRefresh);
  }
  const legacyEmail = localStorage.getItem(LEGACY_EMAIL_KEY);
  if (legacyEmail?.trim()) {
    localStorage.setItem(EMAIL_KEYS[route], legacyEmail.trim().toLowerCase());
  }

  localStorage.removeItem(LEGACY_ACCESS_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
  localStorage.removeItem(LEGACY_ROLE_KEY);
  localStorage.removeItem(LEGACY_EMAIL_KEY);
}

export function getSessionContextFromPath(pathname: string): SessionRole {
  // `/platform/*` is the operator portal — must not use workspace (app) session during login → /admin navigation.
  if (pathname.startsWith('/admin') || pathname.startsWith('/platform')) return 'admin';
  return 'app';
}

export function resolveSessionContext(route?: SessionRole): SessionRole {
  if (route) return route;
  if (!isClient()) return 'app';
  return getSessionContextFromPath(window.location.pathname);
}

export function saveSession(tokens: {
  accessToken: string;
  refreshToken: string;
  route: SessionRole;
  email?: string;
  tenantId?: string;
  workspaceId?: string;
  membershipRole?: string;
  scope?: StoredAuthScope;
}) {
  if (!isClient()) return;
  localStorage.setItem(ACCESS_KEYS[tokens.route], tokens.accessToken);
  localStorage.setItem(REFRESH_KEYS[tokens.route], tokens.refreshToken);
  if (tokens.email?.trim()) {
    localStorage.setItem(EMAIL_KEYS[tokens.route], tokens.email.trim().toLowerCase());
  }
  if (tokens.scope) {
    localStorage.setItem(SCOPE_KEYS[tokens.route], tokens.scope);
  }
  if (tokens.route === 'app') {
    if (tokens.tenantId) localStorage.setItem(TENANT_ID_KEY, tokens.tenantId);
    if (tokens.workspaceId) localStorage.setItem(WORKSPACE_ID_KEY, tokens.workspaceId);
    if (tokens.membershipRole) localStorage.setItem(MEMBERSHIP_ROLE_KEY, tokens.membershipRole);
  }
}

export function clearSession(route?: SessionRole) {
  if (!isClient()) return;
  const ctx = resolveSessionContext(route);
  localStorage.removeItem(ACCESS_KEYS[ctx]);
  localStorage.removeItem(REFRESH_KEYS[ctx]);
  localStorage.removeItem(EMAIL_KEYS[ctx]);
  localStorage.removeItem(SCOPE_KEYS[ctx]);
  if (ctx === 'app') {
    localStorage.removeItem(TENANT_ID_KEY);
    localStorage.removeItem(WORKSPACE_ID_KEY);
    localStorage.removeItem(MEMBERSHIP_ROLE_KEY);
  }
}

export function clearAllSessions() {
  if (!isClient()) return;
  (Object.keys(ACCESS_KEYS) as SessionRole[]).forEach((role) => clearSession(role));
  localStorage.removeItem(LEGACY_ACCESS_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
  localStorage.removeItem(LEGACY_ROLE_KEY);
  localStorage.removeItem(LEGACY_EMAIL_KEY);
}

export function getSessionUserEmail(route?: SessionRole): string | null {
  if (!isClient()) return null;
  migrateLegacySession();
  try {
    return localStorage.getItem(EMAIL_KEYS[resolveSessionContext(route)]);
  } catch {
    return null;
  }
}

export function getSessionTenantId(): string | null {
  if (!isClient()) return null;
  migrateLegacySession();
  try {
    return localStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

export function getSessionWorkspaceId(): string | null {
  if (!isClient()) return null;
  migrateLegacySession();
  try {
    return localStorage.getItem(WORKSPACE_ID_KEY);
  } catch {
    return null;
  }
}

export function getSessionMembershipRole(): string | null {
  if (!isClient()) return null;
  migrateLegacySession();
  try {
    return localStorage.getItem(MEMBERSHIP_ROLE_KEY);
  } catch {
    return null;
  }
}

export function getSessionScope(route?: SessionRole): StoredAuthScope | null {
  if (!isClient()) return null;
  migrateLegacySession();
  try {
    const value = localStorage.getItem(SCOPE_KEYS[resolveSessionContext(route)]);
    if (value === 'platform' || value === 'tenant') return value;
    return null;
  } catch {
    return null;
  }
}

export function getAccessToken(route?: SessionRole): string | null {
  if (!isClient()) return null;
  migrateLegacySession();
  try {
    return localStorage.getItem(ACCESS_KEYS[resolveSessionContext(route)]);
  } catch {
    return null;
  }
}

export function getRefreshToken(route?: SessionRole): string | null {
  if (!isClient()) return null;
  migrateLegacySession();
  try {
    return localStorage.getItem(REFRESH_KEYS[resolveSessionContext(route)]);
  } catch {
    return null;
  }
}

export function getSessionRole(route?: SessionRole): SessionRole | null {
  const ctx = resolveSessionContext(route);
  return getAccessToken(ctx) ? ctx : null;
}

export function isAuthenticated(route?: SessionRole): boolean {
  return Boolean(getAccessToken(route));
}
