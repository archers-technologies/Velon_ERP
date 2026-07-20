import { useEffect, useState } from 'react';
import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { loadCrmDashboardMetrics, type CrmDashboardMetrics } from '@/lib/crm/pipeline-api';
import { cn } from '@/lib/utils';

const salesCrmNav = [
  { to: '/app/crm/leads', label: 'Leads' },
  { to: '/app/crm/opportunities', label: 'Opportunities' },
  { to: '/app/crm/quotations', label: 'Quotations' },
  { to: '/app/crm/proposals', label: 'Proposals' },
  { to: '/app/crm/assets', label: 'Assets' },
  { to: '/app/crm/pipelines', label: 'Pipelines' },
  { to: '/app/crm/templates', label: 'Templates' },
] as const;

export const Route = createFileRoute('/app/crm')({
  beforeLoad: ({ location }) => {
    const p = location.pathname;
    if (p !== '/app/crm' && p !== '/app/crm/') return;

    const section = (location.search as { section?: string })?.section;
    if (section === 'customers' || p === '/app/crm/') {
      throw redirect({ to: '/app/customers', search: { section: 'customers' } });
    }
    throw redirect({ to: '/app/crm/leads' });
  },
  component: SalesCrmLayout,
});

function SalesCrmLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [metrics, setMetrics] = useState<CrmDashboardMetrics | null>(null);

  useEffect(() => {
    void loadCrmDashboardMetrics()
      .then(setMetrics)
      .catch((e) => toast.error(String(e)));
  }, [pathname]);

  const statCards = metrics
    ? [
        { label: 'Total leads', value: metrics.totalLeads },
        { label: 'Qualified leads', value: metrics.qualifiedLeads },
        { label: 'Lead conversion', value: `${metrics.leadConversionRate ?? 0}%` },
        { label: 'Open opportunities', value: metrics.openOpportunities },
        { label: 'Won', value: metrics.wonOpportunities },
        { label: 'Lost', value: metrics.lostOpportunities },
        { label: 'Win rate', value: `${metrics.winRate ?? 0}%` },
        { label: 'Pipeline value', value: `$${metrics.pipelineValue.toLocaleString()}` },
        { label: 'Expected revenue', value: `$${metrics.expectedRevenue.toLocaleString()}` },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          Sales
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Sales CRM</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage leads, opportunities, quotations, proposals, and sales pipeline.
        </p>
      </div>

      {statCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {statCards.map((s) => (
            <Card
              key={s.label}
              className="border-border bg-card p-4"
            >
              <p className="text-muted-foreground text-xs">{s.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      <nav className="border-border flex flex-wrap gap-2 border-b pb-3">
        {salesCrmNav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
