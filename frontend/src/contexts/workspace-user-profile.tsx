import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSessionUserEmail } from '@/lib/auth/session';
import { readWorkspaceName, saveWorkspaceName } from '@/lib/workspace/tenant-workspace';
import {
  bootstrapWorkspaceUser,
  ensureWorkspaceSessions,
  extractDominantBrandColor,
  readWorkspaceUserProfile,
  revokeOtherWorkspaceSessions,
  updateWorkspaceUserProfile,
  type WorkspaceUserProfile,
  type WorkspaceUserSession,
} from '@/lib/workspace/user-profile';

type WorkspaceUserProfileContextValue = {
  profile: WorkspaceUserProfile;
  sessions: WorkspaceUserSession[];
  activeTenantName: string;
  initials: string;
  refresh: () => void;
  patchProfile: (patch: Partial<WorkspaceUserProfile>) => void;
  switchTenant: (tenantId: string) => void;
  revokeOtherSessions: () => void;
  applyWorkspaceLogo: (dataUrl: string, aspect: 'square' | 'wide') => Promise<void>;
};

const WorkspaceUserProfileContext = createContext<WorkspaceUserProfileContextValue | null>(null);

function loadProfile(): WorkspaceUserProfile {
  const workspaceName = readWorkspaceName();
  const stored = readWorkspaceUserProfile();
  if (stored) return stored;
  return {
    email: 'user@workspace.local',
    fullName: 'Workspace User',
    role: 'Workspace Administrator',
    workspaceLogoAspect: 'square',
    mfaEnabled: false,
    assignedTenants: [{ id: 'primary', name: workspaceName, role: 'Workspace Administrator' }],
    activeTenantId: 'primary',
  };
}

export function WorkspaceUserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<WorkspaceUserProfile>(loadProfile);
  const [sessions, setSessions] = useState<WorkspaceUserSession[]>(() =>
    typeof window === 'undefined' ? [] : ensureWorkspaceSessions(),
  );

  const refresh = useCallback(() => {
    setProfile(loadProfile());
    setSessions(ensureWorkspaceSessions());
  }, []);

  useEffect(() => {
    const email = getSessionUserEmail();
    if (email) bootstrapWorkspaceUser({ email, businessName: readWorkspaceName() });
    refresh();
  }, [refresh]);

  useEffect(() => {
    const accent = profile.brandAccentHex;
    if (!accent || typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--workspace-accent', accent);
    return () => {
      document.documentElement.style.removeProperty('--workspace-accent');
    };
  }, [profile.brandAccentHex]);

  const activeTenant = useMemo(
    () =>
      profile.assignedTenants.find((t) => t.id === profile.activeTenantId) ??
      profile.assignedTenants[0],
    [profile],
  );

  const patchProfile = useCallback((patch: Partial<WorkspaceUserProfile>) => {
    setProfile((p) => {
      const next = { ...p, ...patch };
      updateWorkspaceUserProfile(next);
      return next;
    });
  }, []);

  const switchTenant = useCallback(
    (tenantId: string) => {
      const tenant = profile.assignedTenants.find((t) => t.id === tenantId);
      if (!tenant) return;
      patchProfile({ activeTenantId: tenantId, role: tenant.role });
      saveWorkspaceName(tenant.name.replace(/ · West Branch$/, '').trim());
      window.dispatchEvent(new Event('velon-workspace-name-changed'));
    },
    [patchProfile, profile.assignedTenants],
  );

  const revokeOtherSessions = useCallback(() => {
    revokeOtherWorkspaceSessions();
    setSessions(ensureWorkspaceSessions());
  }, []);

  const applyWorkspaceLogo = useCallback(
    async (dataUrl: string, aspect: 'square' | 'wide') => {
      const brandAccentHex = await extractDominantBrandColor(dataUrl);
      patchProfile({ workspaceLogoDataUrl: dataUrl, workspaceLogoAspect: aspect, brandAccentHex });
    },
    [patchProfile],
  );

  const initials = useMemo(() => {
    return profile.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }, [profile.fullName]);

  const value = useMemo(
    () => ({
      profile,
      sessions,
      activeTenantName: activeTenant?.name ?? readWorkspaceName(),
      initials: initials || 'WS',
      refresh,
      patchProfile,
      switchTenant,
      revokeOtherSessions,
      applyWorkspaceLogo,
    }),
    [
      profile,
      sessions,
      activeTenant?.name,
      initials,
      refresh,
      patchProfile,
      switchTenant,
      revokeOtherSessions,
      applyWorkspaceLogo,
    ],
  );

  return (
    <WorkspaceUserProfileContext.Provider value={value}>
      {children}
    </WorkspaceUserProfileContext.Provider>
  );
}

export function useWorkspaceUserProfile() {
  const ctx = useContext(WorkspaceUserProfileContext);
  if (!ctx) {
    throw new Error('useWorkspaceUserProfile must be used within WorkspaceUserProfileProvider');
  }
  return ctx;
}
