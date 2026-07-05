import {
  tenantWorkspaceHost as buildTenantWorkspaceHost,
  resolveWorkspacePublicDomain,
} from '@velon/shared';

function workspacePublicDomain(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return resolveWorkspacePublicDomain(import.meta.env as Record<string, string | undefined>);
  }
  return resolveWorkspacePublicDomain();
}

/** Public workspace host for Super Admin tenant tables and provisioning previews. */
export function tenantWorkspaceHost(slug: string): string {
  return buildTenantWorkspaceHost(slug, workspacePublicDomain());
}

const WORKSPACE_NAME_KEY = 'velon-workspace-name';

export function saveWorkspaceName(name: string) {
  if (typeof window === 'undefined') return;
  const clean = name.trim();
  if (!clean) return;
  localStorage.setItem(WORKSPACE_NAME_KEY, clean);
}

export function readWorkspaceName(): string {
  if (typeof window === 'undefined') return 'Workspace';
  return localStorage.getItem(WORKSPACE_NAME_KEY)?.trim() || 'Workspace';
}
