import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Search, Bell, Sun, Command } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { LucideIcon } from "lucide-react";
import { BrandLogoLink } from "@/components/brand-logo-link";
import type { LogoNav } from "@/lib/logo-navigation";
import { isAdminNavItemActive, isWorkspaceNavItemActive } from "@velon/shared";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  /** When true, shows a "Soon" badge in the sidebar */
  comingSoon?: boolean;
  search?: Record<string, string>;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AppShell({
  brand,
  accent,
  groups,
  title,
  subtitle,
  children,
  initials = "VE",
  headerEnd,
  /** When set, replaces legacy `headerEnd`, theme toggle, and bell (caller supplies full cluster). */
  headerToolbar,
  userMenu,
  sidebarLogoUrl,
  logoNav = { type: "home" },
  navActiveCheck,
}: {
  brand: string;
  accent: string;
  groups: NavGroup[];
  title: string;
  subtitle?: string;
  children: ReactNode;
  initials?: string;
  /** Legacy: currency slot before theme + bell (ignored if `headerToolbar` is passed). */
  headerEnd?: ReactNode;
  headerToolbar?: ReactNode;
  /** Profile dropdown (workspace). Falls back to static avatar when omitted. */
  userMenu?: ReactNode;
  sidebarLogoUrl?: string;
  /** Logo click behavior — defaults to marketing homepage route. */
  logoNav?: LogoNav;
  /** Override sidebar active-state logic (Super Admin uses exact route matching). */
  navActiveCheck?: (pathname: string, to: string, label: string) => boolean;
}) {
  const pathRaw = useRouterState({ select: (s) => s.location.pathname });
  const path = pathRaw !== "/" && pathRaw.endsWith("/") ? pathRaw.slice(0, -1) : pathRaw;
  const isActive = navActiveCheck ?? isWorkspaceNavItemActive;
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <BrandLogoLink nav={logoNav} className="flex items-center gap-2.5 px-5 py-5">
          {sidebarLogoUrl ? (
            <img
              src={sidebarLogoUrl}
              alt=""
              className="h-8 w-8 rounded-lg object-contain bg-white/10"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sidebar font-bold">
              V
            </div>
          )}
          <div>
            <div className="text-sm font-semibold tracking-tight">{brand}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
              {accent}
            </div>
          </div>
        </BrandLogoLink>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/40">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(path, item.to, item.label);
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      search={item.search}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition",
                        active
                          ? "bg-white text-sidebar font-medium"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {(item.comingSoon || item.badge) && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                            item.comingSoon
                              ? "bg-amber-500/20 text-amber-200"
                              : active
                                ? "bg-sidebar text-white"
                                : "bg-sidebar-accent text-sidebar-foreground",
                          )}
                        >
                          {item.comingSoon ? "Soon" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 grid min-h-16 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur-xl sm:px-6 lg:grid-cols-[minmax(160px,240px)_minmax(220px,320px)_minmax(0,1fr)_auto] 2xl:grid-cols-[minmax(200px,320px)_minmax(320px,460px)_minmax(0,1fr)_auto]">
          <div className="min-w-0 lg:w-[240px] lg:max-w-[240px] 2xl:w-[320px] 2xl:max-w-[320px]">
            <div className="truncate text-base font-semibold tracking-tight">{title}</div>
            {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          <div className="relative order-3 col-span-3 hidden w-full max-w-[460px] md:block lg:order-none lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search anything…"
              className="h-9 rounded-lg border-border bg-muted/60 pl-9 pr-14"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>
          <div className="flex min-w-0 justify-end">
            {headerToolbar !== undefined ? (
              headerToolbar
            ) : (
              <>
                {headerEnd}
                <Button variant="ghost" size="icon" className="rounded-lg" type="button">
                  <Sun className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="relative rounded-lg" type="button">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-foreground" />
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5 border-l border-border pl-3">
            {userMenu ?? (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-foreground text-[11px] font-semibold text-background">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

export function Kpi({
  label,
  value,
  delta,
  deltaTone = "up",
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  icon: LucideIcon;
  hint?: string;
}) {
  const deltaCls =
    deltaTone === "up"
      ? "text-success"
      : deltaTone === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-foreground/20 hover:shadow-elegant">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 text-[28px] font-semibold leading-none tracking-tight">{value}</div>
      <div className="mt-2 flex items-center gap-2">
        {delta && <span className={cn("text-xs font-medium", deltaCls)}>{delta}</span>}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
