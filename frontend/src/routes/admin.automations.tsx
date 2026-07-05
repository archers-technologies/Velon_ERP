import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Ban,
  Bell,
  BookOpen,
  CheckCircle2,
  Copy,
  FileText,
  GitBranch,
  Mail,
  MessageSquare,
  MoreHorizontal,
  OctagonAlert,
  Pause,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { guardDisabledAdminPath } from '@/lib/auth/production-routes';
import { loadAutomationCommandCenter } from '@/lib/platform/admin-loaders';
import type {
  AutomationDomainId,
  AutomationStepKind,
  AutomationWorkflowDef,
} from '@/lib/types/workspace-ui';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/admin/automations')({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  loader: () => loadAutomationCommandCenter(),
  component: AdminAutomationsPage,
});

const DOMAIN_LABEL: Record<AutomationDomainId, string> = {
  billing: 'Billing & subscriptions',
  infrastructure: 'Infrastructure & capacity',
  security: 'Security & access',
  lifecycle: 'Tenant lifecycle',
  engagement: 'User engagement',
};

const DOMAIN_BADGE: Record<AutomationDomainId, string> = {
  billing: 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100',
  infrastructure: 'border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100',
  security: 'border-red-500/25 bg-red-500/10 text-red-950 dark:text-red-100',
  lifecycle: 'border-violet-500/30 bg-violet-500/10 text-violet-950 dark:text-violet-100',
  engagement: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100',
};

const STEP_ICONS: Record<AutomationStepKind, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  webhook: Plug,
  notify: Bell,
  suspend: Ban,
  branch: GitBranch,
  alert: AlertTriangle,
  retry: RefreshCw,
  downgrade: TrendingDown,
  upsell: TrendingUp,
};

function blastLabel(b: AutomationWorkflowDef['blastRadius']) {
  switch (b) {
    case 'read_only':
      return 'Read-only / throttle';
    case 'notify':
      return 'Notifications only';
    case 'billing':
      return 'Billing & AR side effects';
    case 'destructive':
      return 'High impact · suspend / downgrade';
    default:
      return '';
  }
}

function effectiveStatus(
  wf: AutomationWorkflowDef,
  globalPaused: boolean,
  userPausedIds: Set<string>,
): AutomationWorkflowDef['status'] | 'paused_global' {
  if (globalPaused) return 'paused_global';
  if (userPausedIds.has(wf.id)) return 'paused';
  return wf.status;
}

function AdminAutomationsPage() {
  const { pulse, workflows } = Route.useLoaderData();
  const [globalPaused, setGlobalPaused] = useState(false);
  const [userPausedIds, setUserPausedIds] = useState<Set<string>>(() => new Set());
  const [domainFilter, setDomainFilter] = useState<'all' | AutomationDomainId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [q, setQ] = useState('');
  const [logFor, setLogFor] = useState<AutomationWorkflowDef | null>(null);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return workflows.filter((w) => {
      if (domainFilter !== 'all' && w.domain !== domainFilter) return false;
      const eff = effectiveStatus(w, globalPaused, userPausedIds);
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && eff !== 'active') return false;
        if (statusFilter === 'paused' && eff !== 'paused' && eff !== 'paused_global') return false;
        if (statusFilter === 'draft' && w.status !== 'draft') return false;
      }
      if (!s) return true;
      return (
        w.triggerLabel.toLowerCase().includes(s) ||
        w.summaryLine.toLowerCase().includes(s) ||
        DOMAIN_LABEL[w.domain].toLowerCase().includes(s)
      );
    });
  }, [workflows, domainFilter, statusFilter, q, globalPaused, userPausedIds]);

  const successAttention = pulse.successRatePct < 99.5;

  return (
    <div className="space-y-6">
      {globalPaused ? (
        <div
          role="status"
          className="border-destructive/40 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-2 font-medium">
            <ShieldOff
              className="h-4 w-4 shrink-0"
              aria-hidden
            />
            Global automation pause is ON — outbound side effects are blocked (demo UI state).
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/50"
            onClick={() => setGlobalPaused(false)}
          >
            Resume platform
          </Button>
        </div>
      ) : null}

      <Card className="border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              System pulse · 24h
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Volume, reliability, and incidents — the same signals you would wire to on-call in
              production.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              className="rounded-lg"
              onClick={() => {
                setGlobalPaused(true);
                toast.error('Global pause engaged', {
                  description: 'All automations would stop side effects until resumed (demo).',
                });
              }}
            >
              <Pause className="mr-1.5 h-4 w-4" />
              Global pause
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() =>
                toast.message('Sandbox', {
                  description: 'Simulation runner opens against masked tenants (demo).',
                })
              }
            >
              Open sandbox
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="border-border bg-muted/30 rounded-lg border p-3">
            <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Executions
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {pulse.executions24h.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">Last 24h · all workflows</p>
          </div>
          <div
            className={cn(
              'rounded-lg border p-3',
              successAttention
                ? 'border-destructive/40 bg-destructive/10'
                : 'border-border bg-muted/30',
            )}
          >
            <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Success rate
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-semibold tabular-nums">{pulse.successRatePct}%</span>
              {!successAttention ? (
                <CheckCircle2
                  className="text-success h-4 w-4"
                  aria-hidden
                />
              ) : null}
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Rolling · excludes cancelled runs
            </p>
          </div>
          <button
            type="button"
            className="border-border bg-muted/30 hover:bg-muted/50 rounded-lg border p-3 text-left transition-colors"
            onClick={() => setErrorsOpen(true)}
          >
            <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Active errors
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-destructive text-xl font-semibold tabular-nums">
                {pulse.activeErrors}
              </span>
              <OctagonAlert
                className="text-destructive h-4 w-4"
                aria-hidden
              />
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">Click for sample trace</p>
          </button>
          <div className="border-border bg-muted/30 rounded-lg border p-3">
            <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Stuck / retrying
            </div>
            <div className="mt-1 text-xl font-semibold text-amber-700 tabular-nums dark:text-amber-300">
              {pulse.stuckRetries}
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">Awaiting backoff or DLQ</p>
          </div>
          <div className="border-border bg-muted/30 rounded-lg border p-3">
            <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Paused rules
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{pulse.pausedWorkflows}</div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">Catalog + operator pauses</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={domainFilter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            className="rounded-lg text-xs"
            onClick={() => setDomainFilter('all')}
          >
            All domains
          </Button>
          {(Object.keys(DOMAIN_LABEL) as AutomationDomainId[]).map((d) => (
            <Button
              key={d}
              type="button"
              variant={domainFilter === d ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-lg text-xs"
              onClick={() => setDomainFilter(d)}
            >
              {DOMAIN_LABEL[d].split(' ')[0]}
            </Button>
          ))}
        </div>
        <Button
          className="bg-foreground text-background hover:bg-foreground/90 shrink-0 rounded-lg"
          type="button"
          onClick={() =>
            toast.message('Workflow builder', {
              description: 'Visual canvas + action blocks (demo).',
            })
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> New workflow
        </Button>
      </div>

      <Card className="border-border bg-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search trigger, domain, summary…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-border bg-muted/40 h-9 rounded-lg pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="h-9 w-[160px] rounded-lg">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active (incl. global run)</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="draft">Draft / sandbox</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          asChild
        >
          <Link
            to="/admin/alerts-logs"
            className="gap-1"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Runbooks &amp; logs
          </Link>
        </Button>
      </Card>

      <div className="space-y-3">
        {filtered.map((wf) => {
          const eff = effectiveStatus(wf, globalPaused, userPausedIds);
          const isDraft = wf.status === 'draft';
          const showPaused = eff === 'paused' || eff === 'paused_global';
          const destructive = wf.blastRadius === 'destructive';

          return (
            <Card
              key={wf.id}
              className={cn(
                'border-border bg-card p-4 sm:p-5',
                destructive && 'border-l-destructive border-l-4',
                wf.recentFailures > 0 && 'border-l-4 border-l-amber-500 sm:border-l',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] font-medium', DOMAIN_BADGE[wf.domain])}
                    >
                      {DOMAIN_LABEL[wf.domain]}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold tracking-wide"
                    >
                      Trigger · {wf.triggerLabel}
                    </Badge>
                    {wf.recentFailures > 0 ? (
                      <span className="text-destructive inline-flex items-center gap-1 text-[11px] font-medium">
                        <span
                          className="bg-destructive h-1.5 w-1.5 animate-pulse rounded-full"
                          aria-hidden
                        />
                        {wf.recentFailures} recent failures
                      </span>
                    ) : (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                          aria-hidden
                        />
                        Healthy
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {wf.steps.map((step, i) => {
                      const Icon = STEP_ICONS[step.kind];
                      return (
                        <span
                          key={`${wf.id}-${step.label}-${i}`}
                          className="contents"
                        >
                          {i > 0 ? (
                            <ArrowRight
                              className="text-muted-foreground/60 h-3 w-3 shrink-0"
                              aria-hidden
                            />
                          ) : null}
                          <span className="border-border bg-muted/40 text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                            <Icon
                              className="h-3 w-3 shrink-0 opacity-80"
                              aria-hidden
                            />
                            {step.label}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{wf.summaryLine}</p>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <span>
                      <span className="text-muted-foreground/80">Runs</span>{' '}
                      <span className="text-foreground font-mono font-medium">
                        {wf.runsPerMonthLabel}
                      </span>
                    </span>
                    <span>
                      <span className="text-muted-foreground/80">Last run</span>{' '}
                      <span className="text-foreground font-medium">{wf.lastRunLabel}</span>
                    </span>
                    {wf.p95Ms > 0 ? (
                      <span>
                        <span className="text-muted-foreground/80">p95</span>{' '}
                        <span className="text-foreground font-mono font-medium">{wf.p95Ms} ms</span>
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <Activity
                        className="h-3 w-3"
                        aria-hidden
                      />
                      {blastLabel(wf.blastRadius)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize',
                      showPaused && 'border-muted-foreground/40 bg-muted',
                      isDraft && !showPaused && 'border-dashed',
                      eff === 'active' && 'border-success/30 bg-success/10 text-success',
                    )}
                  >
                    {eff === 'paused_global' ? 'Paused (global)' : eff}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Workflow actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-52"
                    >
                      {!isDraft ? (
                        <DropdownMenuItem
                          onSelect={() => {
                            const willPause = !userPausedIds.has(wf.id);
                            setUserPausedIds((prev) => {
                              const next = new Set(prev);
                              if (willPause) next.add(wf.id);
                              else next.delete(wf.id);
                              return next;
                            });
                            toast.message(willPause ? 'Paused' : 'Resumed', {
                              description: `${wf.triggerLabel} (demo).`,
                            });
                          }}
                        >
                          {userPausedIds.has(wf.id) ? (
                            <>
                              <Play className="mr-2 h-4 w-4" /> Resume
                            </>
                          ) : (
                            <>
                              <Pause className="mr-2 h-4 w-4" /> Pause
                            </>
                          )}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onSelect={() => setLogFor(wf)}>
                        <FileText className="mr-2 h-4 w-4" /> View logs
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          toast.message('Duplicated', {
                            description: `Copy of ${wf.id} as draft (demo).`,
                          })
                        }
                      >
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() =>
                          toast.message('Definition export', {
                            description: 'YAML / JSON bundle (demo).',
                          })
                        }
                      >
                        Export definition
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">No workflows match filters.</p>
      ) : null}

      <Sheet
        open={errorsOpen}
        onOpenChange={setErrorsOpen}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Active errors · sample</SheetTitle>
            <SheetDescription>
              Scoped traces for automations with failing steps (demo).
            </SheetDescription>
          </SheetHeader>
          <ul className="text-muted-foreground mt-6 space-y-3 text-xs">
            <li className="border-border bg-muted/30 rounded-lg border p-3 font-mono">
              <span className="text-destructive font-sans font-semibold">wf-failed-pay</span> ·
              charge.failed · tenant Pacific Cafe · retry 2/3 · next run 14:22 UTC
            </li>
            <li className="border-border bg-muted/30 rounded-lg border p-3 font-mono">
              <span className="text-destructive font-sans font-semibold">wf-dunning</span> · SMTP
              timeout · message id d-9281-retry
            </li>
            <li className="border-border bg-muted/30 rounded-lg border p-3 font-mono">
              <span className="font-sans font-semibold text-amber-700 dark:text-amber-300">
                wf-storage
              </span>{' '}
              · dry-run only · no prod side effects
            </li>
          </ul>
          <Separator className="my-6" />
          <p className="text-muted-foreground text-xs">
            Policy: failures on <strong className="text-foreground">destructive</strong> paths open
            a billing on-call ticket; others surface here and in Alerts &amp; Logs only.
          </p>
        </SheetContent>
      </Sheet>

      <Sheet
        open={logFor !== null}
        onOpenChange={(o) => !o && setLogFor(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {logFor ? (
            <>
              <SheetHeader>
                <SheetTitle>Run log · {logFor.triggerLabel}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{logFor.id}</SheetDescription>
              </SheetHeader>
              <ul className="text-muted-foreground mt-6 space-y-2 font-mono text-[11px]">
                <li>19:58:01 · trigger.matched · payload hash a3f9…</li>
                <li>19:58:02 · step.email · queued · provider=sendgrid</li>
                <li>19:58:03 · step.email · delivered · 204</li>
                <li>19:58:04 · step.sms · skipped · tenant opted out</li>
                <li>19:58:05 · audit.write · actor=automation-engine</li>
              </ul>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
