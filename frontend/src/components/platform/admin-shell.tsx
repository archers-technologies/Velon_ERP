import type { ReactNode } from "react";
import { marketingSiteOrigin } from "@/lib/shared/logo-navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { AppShell, type NavGroup } from "@/components/workspace/app-shell";
import { AdminUserMenu } from "@/components/platform/admin-user-menu";
import {
  NotificationDropdown,
  type NotificationPreview,
} from "@/components/workspace/notification-dropdown";
import { loadAlertsLogsCommandCenter } from "@/lib/platform/admin-loaders";
import { usePlatformRealtime } from "@/hooks/use-platform-realtime";
import {
  AdminCurrencyProvider,
  adminBooksCurrencyLine,
  useAdminCurrency,
} from "@/contexts/admin-currency";
import {
  applyVelonThemeFromStorage,
  isVelonDocumentDark,
  toggleVelonTheme,
} from "@/lib/shared/document-theme";
import { PlatformSyncIndicator } from "@/components/platform/platform-sync-indicator";
import { isAdminNavItemActive } from "@velon/shared";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Bell,
  Server,
  MapPin,
  Sun,
  Moon,
} from "lucide-react";

export const adminGroups: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { label: "Overview", to: "/admin", icon: LayoutDashboard },
      { label: "Tenants", to: "/admin/tenants", icon: Building2 },
      { label: "Users", to: "/admin/users", icon: Users },
      { label: "Subscriptions", to: "/admin/subscriptions", icon: CreditCard },
      { label: "Website", to: "/admin/website", icon: MapPin },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Alerts & Logs", to: "/admin/alerts-logs", icon: Bell },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Infrastructure", to: "/admin/infrastructure", icon: Server },
    ],
  },
];

function AdminHeaderToolbar({
  notifications,
  unreadCount,
}: {
  notifications: NotificationPreview[];
  unreadCount: number;
}) {
  const { preset, customSymbol } = useAdminCurrency();
  const books = adminBooksCurrencyLine(preset, customSymbol);
  const [dark, setDark] = useState(false);

  useLayoutEffect(() => {
    applyVelonThemeFromStorage();
    setDark(isVelonDocumentDark());
  }, []);

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
      <span
        className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-[10px] font-semibold text-foreground md:hidden"
        title={books}
      >
        {preset === "CUSTOM" ? customSymbol.trim() || "?" : preset}
      </span>
      <div className="hidden min-w-0 flex-col items-end text-right md:flex">
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          Platform figures
        </span>
        <span
          className="max-w-[220px] truncate text-[11px] font-semibold leading-tight"
          title={books}
        >
          {books}
        </span>
      </div>
      <div className="hidden h-8 w-px bg-border md:block" aria-hidden />
      <div
        className="hidden min-w-0 items-center gap-1.5 text-muted-foreground sm:flex"
        title="Primary control plane"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex flex-col items-end text-right">
          <span className="max-w-[min(42vw,200px)] truncate text-[11px] font-medium text-foreground">
            Global · multi-region
          </span>
          <span className="max-w-[min(42vw,200px)] truncate text-[10px] text-muted-foreground">
            Primary · us-east-1
          </span>
        </div>
      </div>
      <PlatformSyncIndicator />
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 rounded-lg"
        type="button"
        onClick={() => {
          toggleVelonTheme();
          setDark(isVelonDocumentDark());
        }}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <NotificationDropdown
        items={notifications}
        unreadCount={unreadCount}
        viewAllHref="/admin/alerts-logs"
        viewAllLabel="View All Alerts"
      />
    </div>
  );
}

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const refreshNotifications = useCallback(() => {
    void loadAlertsLogsCommandCenter()
      .then((data) => {
        setNotifications(
          data.liveAlerts.map((alert) => ({
            id: alert.id,
            title: alert.title,
            detail: alert.rcaHint,
            timestamp: alert.timeLabel,
            priority: alert.severity,
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const platformSync = usePlatformRealtime(true, 3000);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications, platformSync.revision]);

  return (
    <AdminCurrencyProvider>
      <AppShell
        brand="Velon-ERP"
        accent="Super Admin"
        groups={adminGroups}
        navActiveCheck={isAdminNavItemActive}
        initials="SA"
        title={title}
        subtitle={subtitle}
        logoNav={{ type: "external", href: marketingSiteOrigin() }}
        headerToolbar={
          <AdminHeaderToolbar
            notifications={notifications}
            unreadCount={notifications.length}
          />
        }
        userMenu={<AdminUserMenu fallbackInitials="SA" />}
      >
        {children}
      </AppShell>
    </AdminCurrencyProvider>
  );
}
