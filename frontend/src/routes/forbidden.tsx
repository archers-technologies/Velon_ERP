import { createFileRoute, Link } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loginSearch } from '@/lib/auth/login-utils';

export const Route = createFileRoute('/forbidden')({
  validateSearch: (search: Record<string, unknown>) => ({
    portal: search.portal === 'platform' ? 'platform' : 'workspace',
  }),
  head: () => ({
    meta: [{ title: 'Access Denied · Velon-ERP' }],
  }),
  component: ForbiddenPage,
});

function ForbiddenPage() {
  const { portal } = Route.useSearch();
  const isPlatform = portal === 'platform';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="bg-destructive/10 text-destructive flex h-14 w-14 items-center justify-center rounded-full">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">403 — Access denied</h1>
        <p className="text-muted-foreground text-sm">
          {isPlatform
            ? 'Your workspace session cannot access the platform administration portal. Sign in with a platform administrator account.'
            : 'Your platform administrator session cannot access tenant workspaces. Sign in with your company workspace account.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {isPlatform ? (
          <Button
            asChild
            variant="default"
          >
            <Link to="/platform/login">Platform admin sign-in</Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="default"
          >
            <Link
              to="/login"
              search={loginSearch()}
            >
              Workspace sign-in
            </Link>
          </Button>
        )}
        <Button
          asChild
          variant="outline"
        >
          <Link to="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
