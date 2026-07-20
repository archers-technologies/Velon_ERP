import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, Download, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { canWriteHr, normalizeVelonRole } from '@velon/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModuleEmptyState } from '@/components/workspace/module-empty-state';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  createPayrollRun,
  downloadPayslipPdf,
  loadPayrollRuns,
  loadPayslipsByRun,
  processPayrollRun,
  type HrPayrollRun,
  type HrPayslip,
} from '@/lib/hr/api';

export const Route = createFileRoute('/app/hr/payroll')({
  component: HrPayrollRunsPage,
});

function money(value: string | number, currency: string) {
  const amount = typeof value === 'number' ? value : Number(value);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function HrPayrollRunsPage() {
  const canWrite = canWriteHr(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));
  const [rows, setRows] = useState<HrPayrollRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [payslipsByRun, setPayslipsByRun] = useState<Record<string, HrPayslip[]>>({});
  const [loadingPayslips, setLoadingPayslips] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    periodStart: '',
    periodEnd: '',
    currency: 'USD',
  });

  const refresh = useCallback(async () => {
    setRows(await loadPayrollRuns());
  }, []);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    try {
      await createPayrollRun(form);
      toast.success('Payroll run created');
      setForm({ name: '', periodStart: '', periodEnd: '', currency: 'USD' });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function togglePayslips(runId: string) {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }
    setExpandedRunId(runId);
    if (payslipsByRun[runId]) return;
    setLoadingPayslips(runId);
    try {
      const slips = await loadPayslipsByRun(runId);
      setPayslipsByRun((prev) => ({ ...prev, [runId]: slips }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payslips');
      setExpandedRunId(null);
    } finally {
      setLoadingPayslips(null);
    }
  }

  async function onDownloadPayslip(payslip: HrPayslip) {
    try {
      const blob = await downloadPayslipPdf(payslip.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const code = payslip.employee?.employeeCode ?? payslip.id.slice(0, 8);
      a.download = `payslip-${code}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <div className="space-y-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/app/hr">← HR hub</Link>
      </Button>

      {canWrite && (
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">New payroll run</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={onCreate}
          >
            <div className="sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Period start</Label>
              <Input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Period end</Label>
              <Input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={busy}
              >
                Create run
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="border-border bg-card divide-y">
        {rows.map((run) => {
          const expanded = expandedRunId === run.id;
          const slips = payslipsByRun[run.id] ?? [];
          return (
            <div
              key={run.id}
              className="p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  onClick={() => void togglePayslips(run.id)}
                >
                  {expanded ? (
                    <ChevronDown className="text-muted-foreground mt-1 size-4 shrink-0" />
                  ) : (
                    <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{run.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {run.periodStart.slice(0, 10)} → {run.periodEnd.slice(0, 10)} · {run.currency}
                      {run._count ? ` · ${run._count.payslips} payslips` : ''}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{run.status}</Badge>
                  {canWrite && run.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        void processPayrollRun(run.id)
                          .then(async () => {
                            await refresh();
                            const slips = await loadPayslipsByRun(run.id);
                            setPayslipsByRun((prev) => ({ ...prev, [run.id]: slips }));
                            setExpandedRunId(run.id);
                            toast.success('Payroll processed — payslips ready');
                          })
                          .catch((err) =>
                            toast.error(err instanceof Error ? err.message : 'Process failed'),
                          )
                      }
                    >
                      Process
                    </Button>
                  )}
                  {run.status === 'COMPLETED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void togglePayslips(run.id)}
                    >
                      View payslips
                    </Button>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="border-border mt-3 ml-6 space-y-2 border-l pl-4">
                  {loadingPayslips === run.id && (
                    <p className="text-muted-foreground text-sm">Loading payslips…</p>
                  )}
                  {loadingPayslips !== run.id && slips.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No payslips yet. Process this run to generate them for active employees.
                    </p>
                  )}
                  {slips.map((slip) => (
                    <div
                      key={slip.id}
                      className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {slip.employee
                            ? `${slip.employee.firstName} ${slip.employee.lastName}`
                            : 'Employee'}
                          {slip.employee?.employeeCode ? (
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({slip.employee.employeeCode})
                            </span>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Gross {money(slip.grossPay, slip.currency)} · Net{' '}
                          {money(slip.netPay, slip.currency)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void onDownloadPayslip(slip)}
                      >
                        <Download className="mr-1 size-3.5" />
                        PDF
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <ModuleEmptyState
            icon={Wallet}
            title="No payroll runs"
            description="Create a payroll run for a pay period, then process it to generate payslips."
          />
        )}
      </Card>
    </div>
  );
}
