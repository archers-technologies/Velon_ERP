import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModuleEmptyState } from '@/components/workspace/module-empty-state';
import {
  checkInAttendance,
  checkOutAttendance,
  loadAttendance,
  loadEmployees,
  type HrAttendanceRecord,
  type HrEmployee,
} from '@/lib/hr/api';

export const Route = createFileRoute('/app/hr/attendance')({
  component: HrAttendancePage,
});

function formatTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function HrAttendancePage() {
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [records, setRecords] = useState<HrAttendanceRecord[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [e, a] = await Promise.all([
      loadEmployees({ status: 'ACTIVE' }),
      loadAttendance({
        employeeId: employeeId || undefined,
        from: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
      }),
    ]);
    setEmployees(e);
    setRecords(a);
  }, [employeeId]);

  useEffect(() => {
    void refresh().catch((err) => toast.error(String(err)));
  }, [refresh]);

  async function onCheckIn() {
    if (!employeeId) return;
    setBusy(true);
    try {
      await checkInAttendance({ employeeId });
      toast.success('Checked in');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function onCheckOut() {
    if (!employeeId) return;
    setBusy(true);
    try {
      await checkOutAttendance({ employeeId });
      toast.success('Checked out');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check-out failed');
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

      <Card className="border-border bg-card p-6">
        <h2 className="font-semibold">Check in / out</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px]">
            <Label>Employee</Label>
            <Select
              value={employeeId}
              onValueChange={setEmployeeId}
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
          <Button
            disabled={busy || !employeeId}
            onClick={() => void onCheckIn()}
          >
            Check in
          </Button>
          <Button
            variant="outline"
            disabled={busy || !employeeId}
            onClick={() => void onCheckOut()}
          >
            Check out
          </Button>
        </div>
      </Card>

      <Card className="border-border bg-card divide-y">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">
                {record.employee?.firstName} {record.employee?.lastName}
              </p>
              <p className="text-muted-foreground text-xs">
                {record.workDate.slice(0, 10)} · In {formatTime(record.checkInAt)} · Out{' '}
                {formatTime(record.checkOutAt)}
              </p>
            </div>
            <Badge variant="secondary">{record.status}</Badge>
          </div>
        ))}
        {records.length === 0 && (
          <ModuleEmptyState
            icon={Clock}
            title="No attendance records"
            description="Check employees in to start tracking attendance for the last two weeks."
          />
        )}
      </Card>
    </div>
  );
}
