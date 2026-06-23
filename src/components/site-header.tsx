import { Link } from "@tanstack/react-router";
import { BrandLogoLink } from "@/components/brand-logo-link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <BrandLogoLink className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background font-bold">
            V
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Velon<span className="text-muted-foreground">-ERP</span>
          </span>
        </BrandLogoLink>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/features" className="hover:text-foreground">
            Features
          </Link>
          <Link to="/industries" className="hover:text-foreground">
            Industries
          </Link>
          <Link to="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <Link to="/help" className="hover:text-foreground">
            Help
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90"
            asChild
          >
            <Link to="/contact">Contact sales</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
