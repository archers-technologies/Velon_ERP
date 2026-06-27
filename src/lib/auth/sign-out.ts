import { API_V1_BASE, isApiEnabled } from "@/lib/api/config";
import { clearSession, getAccessToken, getRefreshToken, type SessionRole } from "@/lib/auth/session";
import { clearWorkspaceSessionCache } from "@/lib/workspace-user-profile";

async function revokeServerSession(route: SessionRole): Promise<void> {
  const accessToken = getAccessToken(route);
  const refreshToken = getRefreshToken(route);
  if (!accessToken || !isApiEnabled()) return;
  try {
    await fetch(`${API_V1_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken: refreshToken ?? undefined }),
    });
  } catch {
    /* best-effort server revocation */
  }
}

async function signOut(route: SessionRole, redirectTo: string) {
  await revokeServerSession(route);
  clearSession(route);
  if (route === "app") {
    clearWorkspaceSessionCache();
  }
  window.location.href = redirectTo;
}

export function signOutWorkspace() {
  void signOut("app", "/login?tab=signin");
}

export function signOutAdmin() {
  void signOut("admin", "/platform/login");
}
