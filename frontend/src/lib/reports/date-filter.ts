export const REPORT_DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'this_year', label: 'This year' },
  { value: 'custom', label: 'Custom date range' },
] as const;

export type ReportDatePreset = (typeof REPORT_DATE_PRESETS)[number]['value'];

export type ReportDateFilterState = {
  preset: ReportDatePreset;
  startDate: string;
  endDate: string;
  warehouseId?: string;
};

export const defaultReportDateFilter = (): ReportDateFilterState => ({
  preset: 'this_month',
  startDate: '',
  endDate: '',
});

export function reportQueryString(filter: ReportDateFilterState): string {
  const params = new URLSearchParams();
  params.set('preset', filter.preset);
  if (filter.preset === 'custom') {
    if (filter.startDate) params.set('startDate', filter.startDate);
    if (filter.endDate) params.set('endDate', filter.endDate);
  }
  if (filter.warehouseId) params.set('warehouseId', filter.warehouseId);
  return params.toString();
}

export function validateReportDateFilter(filter: ReportDateFilterState): string | null {
  if (filter.preset !== 'custom') return null;
  if (!filter.startDate || !filter.endDate) {
    return 'Select both start and end dates for a custom range.';
  }
  if (filter.endDate < filter.startDate) {
    return 'End date cannot be earlier than start date.';
  }
  return null;
}
