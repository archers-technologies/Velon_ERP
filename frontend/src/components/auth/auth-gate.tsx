import { useEffect, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { isApiEnabled } from '@/lib/api/config';
import { loginSearch } from '@/lib/auth/login-utils';
import { resolveAuthScope } from '@/lib/auth/portal-access';
import { isAuthenticated } from '@/lib/auth/session';

/** Client-side guard when SSR cannot read localStorage. */
export function WorkspaceAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated('app')) {
      void router.navigate({ to: '/login', search: loginSearch() });
      return;
    }
    if (resolveAuthScope('app') !== 'tenant') {
      void router.navigate({ to: '/forbidden', search: { portal: 'workspace' } });
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return <>{children}</>;
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated('admin')) {
      void router.navigate({ to: '/platform/login' });
      return;
    }
    if (resolveAuthScope('admin') !== 'platform') {
      void router.navigate({ to: '/forbidden', search: { portal: 'platform' } });
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready || !isApiEnabled()) return;
    void router.invalidate();
  }, [ready, router]);

  if (!ready) return null;

  return <>{children}</>;
}
