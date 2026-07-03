import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeExternalUrl, type LogoNav } from "@/lib/logo-navigation";
import { AppShell } from "@/components/app-shell";
import { usePlatformRealtime } from "@/hooks/use-platform-realtime";
import {
  WorkspaceCurrencyProvider,
  workspaceBooksCurrencyLine,
  useWorkspaceCurrency,
} from "@/contexts/workspace-currency";
import {
  WorkspacePreferencesProvider,
  useWorkspacePreferences,
} from "@/contexts/workspace-preferences";
import { WorkspaceUserMenu } from "@/components/workspace-user-menu";
import {
  WorkspaceUserProfileProvider,
  useWorkspaceUserProfile,
} from "@/contexts/workspace-user-profile";
import {
  loadWorkspaceAlerts,
  loadWorkspaceIdentity,
  loadWorkspaceNavBadges,
} from "@/lib/workspace/loaders";
import { markAllNotificationsRead } from "@/lib/workspace/mutations";
import { readWorkspaceName, saveWorkspaceName } from "@/lib/tenant-workspace";
import { buildWorkspaceNavGroups } from "@/lib/workspace-nav";
import { QuickCreateFab } from "@/components/workspace/quick-create-fab";
import {
  NotificationDropdown,
  type NotificationPreview,
} from "@/components/notification-dropdown";
import { Button } from "@/components/ui/button";
import { Sun, Moon, MapPin } from "lucide-react";

function WorkspaceHeaderToolbar({
  alertCount,
  notifications,
  onMarkAllRead,
}: {
  alertCount: number;
  notifications: NotificationPreview[];
  onMarkAllRead: () => void | Promise<void>;
}) {
  const { preset, customSymbol } = useWorkspaceCurrency();
  const { theme, toggleTheme, city, country, region } = useWorkspacePreferences();
  const books = workspaceBooksCurrencyLine(preset, customSymbol);
  const locationPrimary = `${city}, ${country}`;
  const locationTitle = `${locationPrimary} · ${region}`;

  return (
    <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
      <span
        className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-[10px] font-semibold text-foreground md:hidden"
        title={books}
      >
        {preset === "CUSTOM" ? customSymbol.trim() || "?" : preset}
      </span>
      <div className="hidden min-w-0 flex-col items-end text-right 2xl:flex">
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          Books in
        </span>
        <span
          className="max-w-[220px] truncate text-[11px] font-semibold leading-tight"
          title={books}
        >
          {books}
        </span>
      </div>
      <div className="hidden h-8 w-px bg-border 2xl:block" aria-hidden />
      <div
        className="hidden min-w-0 items-center gap-1.5 text-muted-foreground 2xl:flex"
        title={locationTitle}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex flex-col items-end text-right">
          <span className="max-w-[min(42vw,200px)] truncate text-[11px] font-medium text-foreground">
            {locationPrimary}
          </span>
          <span className="max-w-[min(42vw,200px)] truncate text-[10px] text-muted-foreground">
            {region}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 rounded-lg"
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <NotificationDropdown
        items={notifications}
        unreadCount={alertCount}
        viewAllHref="/app/alerts"
        viewAllLabel="View All Notifications"
        onMarkAllRead={onMarkAllRead}
      />
    </div>
  );
}

function WorkspaceShellInner({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const getWorkspaceIdentityFn = loadWorkspaceIdentity;
  const getNavBadgesFn = loadWorkspaceNavBadges;
  const getWorkspaceAlertsFn = loadWorkspaceAlerts;
  const { initials, profile } = useWorkspaceUserProfile();
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [tenantWebsite, setTenantWebsite] = useState<string | null>(null);
  const [navBadges, setNavBadges] = useState({ billingOpen: 0, alerts: 0 });
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);

  const refreshNavBadges = useCallback(() => {
    void getNavBadgesFn().then(setNavBadges).catch(() => undefined);
  }, [getNavBadgesFn]);

  const refreshNotifications = useCallback(() => {
    void getWorkspaceAlertsFn()
      .then((alerts) => {
        setNotifications(
          alerts.map((alert) => ({
            id: alert.id,
            title: alert.title,
            detail: alert.body,
            timestamp: alert.createdAt,
          })),
        );
      })
      .catch(() => undefined);
  }, [getWorkspaceAlertsFn]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    refreshNavBadges();
    refreshNotifications();
  }, [refreshNavBadges, refreshNotifications]);

  const platformSync = usePlatformRealtime(true, 3000);

  useEffect(() => {
    refreshNavBadges();
    refreshNotifications();
  }, [refreshNavBadges, refreshNotifications, platformSync.revision]);

  useEffect(() => {
    const sync = () => setWorkspaceName(readWorkspaceName());
    sync();

    const onNameChange = () => sync();
    window.addEventListener("velon-workspace-name-changed", onNameChange);

    const onWebsiteChange = (event: Event) => {
      const website = (event as CustomEvent<{ website?: string | null }>).detail?.website ?? null;
      setTenantWebsite(normalizeExternalUrl(website));
    };
    window.addEventListener("velon-workspace-website-changed", onWebsiteChange);

    void getWorkspaceIdentityFn().then((identity) => {
      if (identity.name && identity.name !== "Workspace") {
        saveWorkspaceName(identity.name);
        setWorkspaceName(identity.name);
      }
      setTenantWebsite(normalizeExternalUrl(identity.website));
    });

    return () => {
      window.removeEventListener("velon-workspace-name-changed", onNameChange);
      window.removeEventListener("velon-workspace-website-changed", onWebsiteChange);
    };
  }, [getWorkspaceIdentityFn]);

  const sidebarLogo =
    profile.workspaceLogoDataUrl && profile.workspaceLogoAspect === "square"
      ? profile.workspaceLogoDataUrl
      : undefined;

  const navGroups = useMemo(() => buildWorkspaceNavGroups(navBadges), [navBadges]);

  const logoNav = useMemo((): LogoNav => ({ type: "workspace" }), []);

  return (
    <AppShell
      brand={workspaceName}
      accent="Easy ERP"
      groups={navGroups}
      initials={initials}
      title={title}
      subtitle={subtitle}
      logoNav={logoNav}
      headerToolbar={
        <WorkspaceHeaderToolbar
          alertCount={navBadges.alerts}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
        />
      }
      userMenu={<WorkspaceUserMenu />}
      sidebarLogoUrl={sidebarLogo}
    >
      {children}
      <QuickCreateFab />
    </AppShell>
  );
}

export function WorkspaceShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <WorkspaceUserProfileProvider>
      <WorkspaceCurrencyProvider>
        <WorkspacePreferencesProvider>
          <WorkspaceShellInner title={title} subtitle={subtitle}>
            {children}
          </WorkspaceShellInner>
        </WorkspacePreferencesProvider>
      </WorkspaceCurrencyProvider>
    </WorkspaceUserProfileProvider>
  );
}
