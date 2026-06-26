import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Search, Sun, Command, Menu } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { LucideIcon } from "lucide-react";
import { BrandLogoLink } from "@/components/brand-logo-link";
import { VelonLogoMark } from "@/components/velon-logo-mark";
import type { LogoNav } from "@/lib/logo-navigation";
import { isAdminNavItemActive, isWorkspaceNavItemActive } from "@velon/shared";
import { PageBreadcrumbs, breadcrumbsFromPath } from "@/components/page-breadcrumbs";

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

function SidebarNav({
  groups,
  path,
  isActive,
  onNavigate,
}: {
  groups: NavGroup[];
  path: string;
  isActive: (pathname: string, to: string, label: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
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
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition",
                    active
                      ? "bg-sidebar-primary/15 font-medium text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/25"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {(item.comingSoon || item.badge) && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        item.comingSoon
                          ? "bg-amber-500/20 text-amber-200"
                          : active
                            ? "bg-sidebar-primary/25 text-sidebar-primary-foreground"
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
  );
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
  showBreadcrumbs = true,
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
  showBreadcrumbs?: boolean;
}) {
  const pathRaw = useRouterState({ select: (s) => s.location.pathname });
  const path = pathRaw !== "/" && pathRaw.endsWith("/") ? pathRaw.slice(0, -1) : pathRaw;
  const isActive = navActiveCheck ?? isWorkspaceNavItemActive;
  const [mobileOpen, setMobileOpen] = useState(false);
  const breadcrumbSegments = breadcrumbsFromPath(path, title);

  const sidebarBrand = (
    <BrandLogoLink nav={logoNav} className="flex items-center gap-2.5 px-5 py-5">
      {sidebarLogoUrl ? (
        <img
          src={sidebarLogoUrl}
          alt=""
          className="h-8 w-8 rounded-lg object-contain bg-white/10"
        />
      ) : (
        <VelonLogoMark size="sm" variant="sidebar" />
      )}
      <div>
        <div className="text-sm font-semibold tracking-tight">{brand}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
          {accent}
        </div>
      </div>
    </BrandLogoLink>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        {sidebarBrand}
        <SidebarNav groups={groups} path={path} isActive={isActive} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {sidebarBrand}
          <SidebarNav
            groups={groups}
            path={path}
            isActive={isActive}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur-xl sm:gap-3 sm:px-6 lg:grid-cols-[minmax(160px,240px)_minmax(220px,320px)_minmax(0,1fr)_auto] 2xl:grid-cols-[minmax(200px,320px)_minmax(320px,460px)_minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-center gap-2 lg:w-[240px] lg:max-w-[240px] 2xl:w-[320px] 2xl:max-w-[320px]">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-lg lg:hidden"
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold tracking-tight">{title}</div>
              {subtitle && (
                <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
              )}
            </div>
          </div>
          <div className="relative order-3 col-span-3 hidden w-full max-w-[460px] md:block lg:order-none lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search anything…"
              className="h-9 rounded-lg border-border bg-muted/50 pl-9 pr-14 focus-visible:ring-primary/30"
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
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5 border-l border-border pl-3">
            {userMenu ?? (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {showBreadcrumbs ? <PageBreadcrumbs segments={breadcrumbSegments} /> : null}
          {children}
        </main>
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
    <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-sm transition hover:border-primary/20 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8 text-primary">
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
