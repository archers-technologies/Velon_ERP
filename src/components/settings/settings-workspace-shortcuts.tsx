import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSessionMembershipRole } from "@/lib/auth/session";
import {
  canManageWorkspaceBilling,
  canManageWorkspaceSettings,
  normalizeVelonRole,
  parseWorkspaceAdminSection,
  SETTINGS_PATHS,
  settingsBillingSearch,
  workspaceAdminSearch,
  VelonRole,
} from "@velon/shared";

export function SettingsWorkspaceShortcuts() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const role = normalizeVelonRole(getSessionMembershipRole() ?? VelonRole.USER);
  const canBilling = canManageWorkspaceBilling(role);
  const canAdmin = canManageWorkspaceSettings(role);

  if (!canBilling && !canAdmin) return null;

  const onBillingPage = pathname === SETTINGS_PATHS.billing;
  const onAdminPage = pathname === SETTINGS_PATHS.admin;
  const adminSection = useRouterState({
    select: (s) => {
      if (s.location.pathname !== SETTINGS_PATHS.admin) return null;
      return parseWorkspaceAdminSection(new URLSearchParams(s.location.searchStr).get("section"));
    },
  });

  const focusAdminUsers = () => {
    document.getElementById("workspace-admin-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-3">
      {canBilling ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">Subscription & billing</p>
            <p className="text-xs text-muted-foreground">
              View your plan, invoices, payment history, and payment methods.
            </p>
          </div>
          {onBillingPage ? (
            <Button size="sm" variant="outline" disabled aria-label="You are on subscription billing">
              Open billing
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link
                to={SETTINGS_PATHS.billing}
                search={settingsBillingSearch()}
                aria-label="Open subscription and billing"
              >
                Open billing
              </Link>
            </Button>
          )}
        </Card>
      ) : null}

      {canAdmin ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">Workspace administration</p>
            <p className="text-xs text-muted-foreground">
              Manage users, departments, seats, roles, and invitations.
            </p>
          </div>
          {onAdminPage ? (
            <Button
              size="sm"
              onClick={() => {
                if (adminSection === "users") {
                  focusAdminUsers();
                  return;
                }
                void navigate({
                  to: SETTINGS_PATHS.admin,
                  search: workspaceAdminSearch("users"),
                  replace: true,
                });
              }}
              aria-label="Manage workspace users"
            >
              Manage users
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link
                to={SETTINGS_PATHS.admin}
                search={workspaceAdminSearch("users")}
                aria-label="Manage workspace users and administration"
              >
                Manage workspace
              </Link>
            </Button>
          )}
        </Card>
      ) : null}
    </div>
  );
}
