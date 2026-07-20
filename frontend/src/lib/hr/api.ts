import { apiFetch } from '@/lib/api/client';
import { API_V1_BASE } from '@/lib/api/config';
import { getAccessToken } from '@/lib/auth/session';

export type HrEmploymentStatus = 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'TERMINATED';
export type HrLeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type HrPayrollRunStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export type HrMetrics = {
  headcountByStatus: { status: HrEmploymentStatus; count: number }[];
  pendingLeaveRequests: number;
  openJobOpenings: number;
};

export type HrEmployee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  hireDate: string;
  status: HrEmploymentStatus;
  departmentId: string | null;
  designationId: string | null;
  baseSalary: string | number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  designation?: { id: string; name: string } | null;
};

export type HrLeaveType = {
  id: string;
  name: string;
  code: string;
  paid: boolean;
  annualAllowance: string | number;
  accrualEnabled: boolean;
};

export type HrLeaveRequest = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: string | number;
  reason: string | null;
  status: HrLeaveRequestStatus;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string };
  leaveType?: { id: string; name: string; code: string };
};

export type HrAttendanceRecord = {
  id: string;
  employeeId: string;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string };
};

export type HrPayrollRun = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  status: HrPayrollRunStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { payslips: number };
};

export type HrPayslip = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: string | number;
  deductions: string | number;
  netPay: string | number;
  currency: string;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: { id: string; name: string } | null;
  };
};

function q(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function loadHrMetrics() {
  return apiFetch<HrMetrics>('/hr/metrics');
}

export function loadEmployees(filters?: { search?: string; status?: HrEmploymentStatus }) {
  return apiFetch<HrEmployee[]>(
    `/hr/employees${q({
      search: filters?.search,
      status: filters?.status,
    })}`,
  );
}

export function createEmployee(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  hireDate: string;
  status?: HrEmploymentStatus;
  baseSalary?: number;
}) {
  return apiFetch<HrEmployee>('/hr/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteEmployee(id: string) {
  return apiFetch(`/hr/employees/${id}`, { method: 'DELETE' });
}

export function loadLeaveTypes() {
  return apiFetch<HrLeaveType[]>('/hr/leave-types');
}

export function createLeaveType(data: {
  name: string;
  code: string;
  paid?: boolean;
  annualAllowance?: number;
}) {
  return apiFetch<HrLeaveType>('/hr/leave-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteLeaveType(id: string) {
  return apiFetch(`/hr/leave-types/${id}`, { method: 'DELETE' });
}

export function loadLeaveRequests(filters?: {
  employeeId?: string;
  status?: HrLeaveRequestStatus;
}) {
  return apiFetch<HrLeaveRequest[]>(
    `/hr/leave-requests${q({
      employeeId: filters?.employeeId,
      status: filters?.status,
    })}`,
  );
}

export function createLeaveRequest(data: {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}) {
  return apiFetch<HrLeaveRequest>('/hr/leave-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function approveLeaveRequest(id: string) {
  return apiFetch<HrLeaveRequest>(`/hr/leave-requests/${id}/approve`, { method: 'POST' });
}

export function rejectLeaveRequest(id: string, reason?: string) {
  return apiFetch<HrLeaveRequest>(`/hr/leave-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function loadAttendance(filters?: { employeeId?: string; from?: string; to?: string }) {
  return apiFetch<HrAttendanceRecord[]>(
    `/hr/attendance${q({
      employeeId: filters?.employeeId,
      from: filters?.from,
      to: filters?.to,
    })}`,
  );
}

export function checkInAttendance(data: { employeeId: string; notes?: string }) {
  return apiFetch('/hr/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function checkOutAttendance(data: { employeeId: string }) {
  return apiFetch('/hr/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function loadPayrollRuns(filters?: { status?: HrPayrollRunStatus }) {
  return apiFetch<HrPayrollRun[]>(
    `/hr/payroll-runs${q({
      status: filters?.status,
    })}`,
  );
}

export function createPayrollRun(data: {
  name: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
}) {
  return apiFetch<HrPayrollRun>('/hr/payroll-runs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function processPayrollRun(id: string) {
  return apiFetch<HrPayrollRun>(`/hr/payroll-runs/${id}/process`, { method: 'POST' });
}

export function loadPayslipsByRun(runId: string) {
  return apiFetch<HrPayslip[]>(`/hr/payroll-runs/${runId}/payslips`);
}

export async function downloadPayslipPdf(payslipId: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_V1_BASE}/hr/payslips/${payslipId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to download payslip PDF');
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/pdf')) {
    throw new Error('Payslip PDF is not available yet');
  }
  return res.blob();
}
