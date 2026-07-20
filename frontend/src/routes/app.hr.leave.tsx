import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { canWriteHr, normalizeVelonRole } from '@velon/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModuleEmptyState } from '@/components/workspace/module-empty-state';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  approveLeaveRequest,
  createLeaveRequest,
  createLeaveType,
  deleteLeaveType,
  loadEmployees,
  loadLeaveRequests,
  loadLeaveTypes,
  rejectLeaveRequest,
  type HrEmployee,
  type HrLeaveRequest,
  type HrLeaveType,
} from '@/lib/hr/api';

export const Route = createFileRoute('/app/hr/leave')({
  component: HrLeavePage,
});

function HrLeavePage() {
  const canWrite = canWriteHr(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveType[]>([]);
  const [requests, setRequests] = useState<HrLeaveRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', code: '', annualAllowance: '0' });
  const [requestForm, setRequestForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    days: '1',
    reason: '',
  });

  const refresh = useCallback(async () => {
    const [e, t, r] = await Promise.all([loadEmployees(), loadLeaveTypes(), loadLeaveRequests()]);
    setEmployees(e);
    setLeaveTypes(t);
    setRequests(r);
  }, []);

  useEffect(() => {
    void refresh().catch((err) => toast.error(String(err)));
  }, [refresh]);

  async function onCreateType(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    try {
      await createLeaveType({
        name: typeForm.name,
        code: typeForm.code,
        annualAllowance: Number(typeForm.annualAllowance),
      });
      toast.success('Leave type created');
      setTypeForm({ name: '', code: '', annualAllowance: '0' });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function onCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!requestForm.employeeId || !requestForm.leaveTypeId) return;
    setBusy(true);
    try {
      await createLeaveRequest({
        employeeId: requestForm.employeeId,
        leaveTypeId: requestForm.leaveTypeId,
        startDate: requestForm.startDate,
        endDate: requestForm.endDate,
        days: Number(requestForm.days),
        reason: requestForm.reason || undefined,
      });
      toast.success('Leave request submitted');
      setRequestForm({
        employeeId: '',
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        days: '1',
        reason: '',
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
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

      <div className="grid gap-4 lg:grid-cols-2">
        {canWrite && (
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Leave types</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={onCreateType}
            >
              <div>
                <Label>Name</Label>
                <Input
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Annual allowance (days)</Label>
                <Input
                  type="number"
                  value={typeForm.annualAllowance}
                  onChange={(e) => setTypeForm({ ...typeForm, annualAllowance: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-fit"
              >
                Add leave type
              </Button>
            </form>
            <div className="mt-4 space-y-2">
              {leaveTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <span className="text-sm">
                    {type.name} ({type.code}) · {Number(type.annualAllowance)} days
                  </span>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void deleteLeaveType(type.id)
                          .then(refresh)
                          .then(() => toast.success('Deleted'))
                      }
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">New leave request</h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={onCreateRequest}
          >
            <div>
              <Label>Employee</Label>
              <Select
                value={requestForm.employeeId}
                onValueChange={(v) => setRequestForm({ ...requestForm, employeeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem
                      key={e.id}
                      value={e.id}
                    >
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave type</Label>
              <Select
                value={requestForm.leaveTypeId}
                onValueChange={(v) => setRequestForm({ ...requestForm, leaveTypeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start</Label>
                <Input
                  type="date"
                  value={requestForm.startDate}
                  onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="date"
                  value={requestForm.endDate}
                  onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Days</Label>
              <Input
                type="number"
                step="0.5"
                value={requestForm.days}
                onChange={(e) => setRequestForm({ ...requestForm, days: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Input
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-fit"
            >
              Submit request
            </Button>
          </form>
        </Card>
      </div>

      <Card className="border-border bg-card divide-y">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">
                {request.employee?.firstName} {request.employee?.lastName} ·{' '}
                {request.leaveType?.name ?? request.leaveTypeId}
              </p>
              <p className="text-muted-foreground text-xs">
                {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)} ·{' '}
                {Number(request.days)} days
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{request.status}</Badge>
              {canWrite && request.status === 'PENDING' && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      void approveLeaveRequest(request.id)
                        .then(refresh)
                        .then(() => toast.success('Approved'))
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void rejectLeaveRequest(request.id)
                        .then(refresh)
                        .then(() => toast.success('Rejected'))
                    }
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <ModuleEmptyState
            icon={CalendarDays}
            title="No leave requests"
            description="Create leave types and submit employee leave requests here."
          />
        )}
      </Card>
    </div>
  );
}
