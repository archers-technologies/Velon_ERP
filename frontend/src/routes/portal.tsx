import { createFileRoute, redirect } from '@tanstack/react-router';
import { SHOWCASE_PUBLIC_ROUTES } from '@/lib/auth/production-routes';

export const Route = createFileRoute('/portal')({
  beforeLoad: () => {
    throw redirect({
      to: '/unavailable',
      search: { feature: SHOWCASE_PUBLIC_ROUTES['/portal'] },
    });
  },
});
