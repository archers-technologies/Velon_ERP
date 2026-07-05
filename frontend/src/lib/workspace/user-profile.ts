import { readWorkspaceName } from '@/lib/workspace/tenant-workspace';

const PROFILE_KEY = 'velon-workspace-user-profile';
const SESSIONS_KEY = 'velon-workspace-user-sessions';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type WorkspaceTenantAssignment = {
  id: string;
  name: string;
  role: string;
};

export type WorkspaceUserProfile = {
  email: string;
  fullName: string;
  role: string;
  avatarDataUrl?: string;
  workspaceLogoDataUrl?: string;
  /** Square (sidebar) or wide (header bar). */
  workspaceLogoAspect: 'square' | 'wide';
  brandAccentHex?: string;
  mfaEnabled: boolean;
  assignedTenants: WorkspaceTenantAssignment[];
  activeTenantId: string;
};

export type WorkspaceUserSession = {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
};

function defaultTenants(workspaceName: string): WorkspaceTenantAssignment[] {
  const primary: WorkspaceTenantAssignment = {
    id: 'primary',
    name: workspaceName,
    role: 'Workspace Administrator',
  };
  return [
    primary,
    {
      id: 'demo-branch',
      name: `${workspaceName} · West Branch`,
      role: 'Operations Manager',
    },
  ];
}

function profileFromEmail(email: string, workspaceName: string): WorkspaceUserProfile {
  const local = email.split('@')[0] ?? 'user';
  const fullName = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  const tenants = defaultTenants(workspaceName);
  return {
    email,
    fullName: fullName || 'Workspace User',
    role: tenants[0]?.role ?? 'Workspace User',
    workspaceLogoAspect: 'square',
    mfaEnabled: false,
    assignedTenants: tenants,
    activeTenantId: tenants[0]?.id ?? 'primary',
  };
}

export function readWorkspaceUserProfile(): WorkspaceUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceUserProfile;
  } catch {
    return null;
  }
}

export function writeWorkspaceUserProfile(profile: WorkspaceUserProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* quota */
  }
}

export function bootstrapWorkspaceUser(input: {
  email: string;
  businessName?: string;
  fullName?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  const workspaceName = input.businessName?.trim() || readWorkspaceName();
  const existing = readWorkspaceUserProfile();
  if (existing?.email === email) {
    const tenants = existing.assignedTenants.length
      ? existing.assignedTenants
      : defaultTenants(workspaceName);
    const primary = tenants.find((t) => t.id === 'primary');
    if (primary && workspaceName !== 'Workspace') {
      primary.name = workspaceName;
    }
    writeWorkspaceUserProfile({
      ...existing,
      assignedTenants: tenants,
      ...(input.fullName?.trim() ? { fullName: input.fullName.trim(), role: 'Tenant Owner' } : {}),
    });
    return;
  }
  const profile = profileFromEmail(email, workspaceName);
  if (input.fullName?.trim()) {
    profile.fullName = input.fullName.trim();
    profile.role = 'Tenant Super Admin';
  }
  writeWorkspaceUserProfile(profile);
}

export function updateWorkspaceUserProfile(patch: Partial<WorkspaceUserProfile>) {
  const current =
    readWorkspaceUserProfile() ?? profileFromEmail('user@workspace.local', readWorkspaceName());
  writeWorkspaceUserProfile({ ...current, ...patch });
}

export function getUserInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      reject(new Error('Use a JPG or PNG image.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Image must be 2MB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

export function readWorkspaceSessions(): WorkspaceUserSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) return JSON.parse(raw) as WorkspaceUserSession[];
  } catch {
    /* ignore */
  }
  return seedSessions();
}

function detectCurrentDevice(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const browser = /CriOS/i.test(ua) ? 'Chrome' : /FxiOS/i.test(ua) ? 'Firefox' : 'Safari';
    const device = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
    return `${device} · ${browser}`;
  }
  if (/Android/i.test(ua)) return 'Android · Chrome';
  if (/Mac/i.test(ua)) return 'Mac · Chrome';
  if (/Win/i.test(ua)) return 'Windows · Chrome';
  return 'Web browser';
}

function seedSessions(): WorkspaceUserSession[] {
  const now = new Date().toISOString();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown device';
  return [
    {
      id: 'current',
      device: detectCurrentDevice(ua),
      location: 'This device',
      lastActive: now,
      current: true,
    },
  ];
}

export function writeWorkspaceSessions(sessions: WorkspaceUserSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    /* ignore */
  }
}

export function ensureWorkspaceSessions(): WorkspaceUserSession[] {
  const cached = readWorkspaceSessions();
  const list = cached.filter((s) => s.id !== 'mobile-demo');
  if (list.length) {
    if (list.length !== cached.length) writeWorkspaceSessions(list);
    return list;
  }
  const seeded = seedSessions();
  writeWorkspaceSessions(seeded);
  return seeded;
}

export function revokeOtherWorkspaceSessions() {
  const current = ensureWorkspaceSessions().find((s) => s.current) ?? seedSessions()[0];
  if (!current) return;
  writeWorkspaceSessions([{ ...current, lastActive: new Date().toISOString() }]);
}

export function clearWorkspaceSessionCache() {
  try {
    localStorage.removeItem(SESSIONS_KEY);
  } catch {
    /* ignore */
  }
}

export async function extractDominantBrandColor(dataUrl: string): Promise<string> {
  if (typeof document === 'undefined') return '#2563eb';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 48;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#2563eb');
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3]! < 160) continue;
        r += data[i]!;
        g += data[i + 1]!;
        b += data[i + 2]!;
        n++;
      }
      if (!n) {
        resolve('#2563eb');
        return;
      }
      const hex = (v: number) =>
        Math.min(220, Math.round(v / n))
          .toString(16)
          .padStart(2, '0');
      resolve(`#${hex(r)}${hex(g)}${hex(b)}`);
    };
    img.onerror = () => resolve('#2563eb');
    img.src = dataUrl;
  });
}
