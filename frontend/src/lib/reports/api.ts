import { apiFetch } from '@/lib/api/client';
import { API_V1_BASE } from '@/lib/api/config';
import { getAccessToken, resolveSessionContext } from '@/lib/auth/session';
import { reportQueryString, type ReportDateFilterState } from '@/lib/reports/date-filter';

export async function fetchReports(filter: ReportDateFilterState) {
  const qs = reportQueryString(filter);
  return apiFetch(`/workspace/reports?${qs}`);
}

export async function fetchAccounting(filter: ReportDateFilterState) {
  const qs = reportQueryString(filter);
  return apiFetch(`/workspace/accounting?${qs}`);
}

export async function downloadReportExport(
  filter: ReportDateFilterState,
  format: 'csv' | 'pdf' = 'csv',
) {
  const params = new URLSearchParams(reportQueryString(filter));
  params.set('format', format);
  const context = resolveSessionContext();
  const token = getAccessToken(context);
  const headers = new Headers({ Accept: format === 'csv' ? 'text/csv' : 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_V1_BASE}/workspace/reports/export?${params}`, {
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    throw new Error('Export failed');
  }
  if (format === 'csv') {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velon-sales-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  return response.json();
}
