import { Link } from '@tanstack/react-router';
import { VELON_CONTACT_EMAIL } from '@velon/shared';
import { VelonLogoMark } from '@/components/marketing/velon-logo-mark';
import type { PublicSiteContent } from '@/lib/cms/load-public';

type SiteFooterProps = {
  footer?: PublicSiteContent['footer'];
  contact?: PublicSiteContent['contact'];
};

export function SiteFooter({ footer, contact }: SiteFooterProps = {}) {
  const tagline = footer?.tagline ?? 'Velon-ERP';
  const email = footer?.email ?? contact?.email ?? VELON_CONTACT_EMAIL;
  const links = footer?.links ?? [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <footer className="border-border bg-background text-muted-foreground border-t text-xs">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-2">
            <VelonLogoMark size="xs" />
            <span className="text-foreground font-medium">{tagline}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end">
            <Link
              to="/privacy"
              className="hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="hover:text-foreground"
            >
              Terms of Service
            </Link>
            <Link
              to="/refund-policy"
              className="hover:text-foreground"
            >
              Refund Policy
            </Link>
            <Link
              to="/help"
              className="hover:text-foreground"
            >
              Help
            </Link>
            {links.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="hover:text-foreground"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="hover:text-foreground"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>

        <div className="border-border/60 border-t pt-6 text-center sm:text-left">
          <p className="text-foreground/90 text-sm">
            Velon ERP Powered by{' '}
            <a
              href="https://archerstechnologies.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Archers Technologies
            </a>
          </p>
          <p className="mt-2">
            <a
              href={`mailto:${email}`}
              className="hover:text-foreground"
            >
              {email}
            </a>
            {contact?.phone ? (
              <>
                <span className="text-border mx-2">·</span>
                <span>{contact.phone}</span>
              </>
            ) : null}
          </p>
        </div>

        <p className="text-center text-[11px] sm:text-left">
          © 2026 Archers Technologies. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
