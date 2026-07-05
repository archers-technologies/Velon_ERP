import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { BrandLogoLink } from "@/components/marketing/brand-logo-link";
import { VelonLogoMark } from "@/components/marketing/velon-logo-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { loginSearch } from "@/lib/auth/login-utils";

const NAV_LINKS = [
  { to: "/features", label: "Features" },
  { to: "/industries", label: "Industries" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/help", label: "Help" },
] as const;

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLogoLink className="flex shrink-0 items-center gap-2.5">
          <VelonLogoMark size="sm" />
          <span className="text-lg font-semibold tracking-tight">
            Velon<span className="text-muted-foreground">-ERP</span>
          </span>
        </BrandLogoLink>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" className="border-border" asChild>
            <Link to="/login" search={loginSearch({ tab: "signin" })}>
              Login
            </Link>
          </Button>

          <Button
            size="sm"
            className="hidden bg-foreground text-background hover:bg-foreground/90 md:inline-flex"
            asChild
          >
            <Link to="/contact">Contact sales</Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[min(100vw-2rem,20rem)]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 border-t border-border pt-4">
              <Button
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                asChild
              >
                <Link to="/contact" onClick={() => setMobileOpen(false)}>
                  Contact sales
                </Link>
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
