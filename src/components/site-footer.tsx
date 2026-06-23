import { Link } from "@tanstack/react-router";
import { VELON_CONTACT_EMAIL } from "@velon/shared";
import type { PublicSiteContent } from "@/lib/cms/load-public";

type SiteFooterProps = {
  footer?: PublicSiteContent["footer"];
  contact?: PublicSiteContent["contact"];
};

export function SiteFooter({ footer, contact }: SiteFooterProps = {}) {
  const tagline = footer?.tagline ?? "Velon Technologies";
  const email = footer?.email ?? contact?.email ?? VELON_CONTACT_EMAIL;
  const links = footer?.links ?? [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer className="border-t border-border bg-background text-xs text-muted-foreground">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-background">
              V
            </div>
            <span className="font-medium text-foreground">{tagline}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
            <Link to="/refund-policy" className="hover:text-foreground">
              Refund Policy
            </Link>
            <Link to="/help" className="hover:text-foreground">
              Help
            </Link>
            {links.map((link) =>
              link.href.startsWith("/") ? (
                <Link key={link.href} to={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              ) : (
                <a key={link.href} href={link.href} className="hover:text-foreground">
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>

        <div className="border-t border-border/60 pt-6 text-center sm:text-left">
          <p className="text-sm text-foreground/90">
            Velon-ERP is designed and developed by{" "}
            <span className="font-medium text-foreground">Archers Technologies</span>.
          </p>
          <p className="mt-2">
            <a href={`mailto:${email}`} className="hover:text-foreground">
              {email}
            </a>
            {contact?.phone ? (
              <>
                <span className="mx-2 text-border">·</span>
                <span>{contact.phone}</span>
              </>
            ) : null}
          </p>
        </div>

        <p className="text-center text-[11px] sm:text-left">© 2026 Velon Systems. All rights reserved.</p>
      </div>
    </footer>
  );
}
