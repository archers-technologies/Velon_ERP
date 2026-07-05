import { createFileRoute, Link } from '@tanstack/react-router';
import { Construction } from 'lucide-react';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { loginSearch } from '@/lib/auth/login-utils';

export const Route = createFileRoute('/unavailable')({
  validateSearch: (search: Record<string, unknown>) => ({
    feature: typeof search.feature === 'string' ? search.feature : 'This page',
  }),
  head: () => ({
    meta: [{ title: 'Unavailable · Velon-ERP' }],
  }),
  component: UnavailablePage,
});

function UnavailablePage() {
  const { feature } = Route.useSearch();

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-full">
          <Construction className="h-7 w-7" />
        </div>
        <Card className="border-border bg-card mt-6 max-w-lg p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{feature} is not available</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            This preview page is not part of the production Velon ERP workspace. Sign up or sign in
            to access your company workspace, CRM, inventory, and billing.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link
                to="/login"
                search={loginSearch({ tab: 'signup' })}
              >
                Create workspace
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
