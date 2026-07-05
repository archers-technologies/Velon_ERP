import { createFileRoute, redirect } from '@tanstack/react-router';

/** Base /app/crm/ redirects via parent beforeLoad. */
export const Route = createFileRoute('/app/crm/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/customers', search: { section: 'customers' } });
  },
  component: () => null,
});
