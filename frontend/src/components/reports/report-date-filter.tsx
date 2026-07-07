import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  defaultReportDateFilter,
  REPORT_DATE_PRESETS,
  validateReportDateFilter,
  type ReportDateFilterState,
} from '@/lib/reports/date-filter';

type ReportDateFilterProps = {
  value: ReportDateFilterState;
  onChange: (next: ReportDateFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
  periodLabel?: string;
  warehouses?: Array<{ id: string; name: string }>;
};

export function ReportDateFilter({
  value,
  onChange,
  onApply,
  onReset,
  loading,
  periodLabel,
  warehouses,
}: ReportDateFilterProps) {
  const validationError = validateReportDateFilter(value);

  return (
    <div className="border-border bg-card space-y-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Report period</p>
          {periodLabel ? (
            <p className="text-muted-foreground text-xs">
              Showing: <span className="text-foreground font-medium">{periodLabel}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={loading}
          >
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onApply}
            disabled={loading || Boolean(validationError)}
          >
            Apply filter
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Period</Label>
          <Select
            value={value.preset}
            onValueChange={(preset) =>
              onChange({ ...value, preset: preset as ReportDateFilterState['preset'] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_DATE_PRESETS.map((p) => (
                <SelectItem
                  key={p.value}
                  value={p.value}
                >
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {value.preset === 'custom' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="report-start-date">Start date</Label>
              <Input
                id="report-start-date"
                type="date"
                value={value.startDate}
                onChange={(e) => onChange({ ...value, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-end-date">End date</Label>
              <Input
                id="report-end-date"
                type="date"
                value={value.endDate}
                onChange={(e) => onChange({ ...value, endDate: e.target.value })}
              />
            </div>
          </>
        ) : null}

        {warehouses?.length ? (
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select
              value={value.warehouseId ?? 'all'}
              onValueChange={(id) =>
                onChange({ ...value, warehouseId: id === 'all' ? undefined : id })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem
                    key={w.id}
                    value={w.id}
                  >
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {validationError ? <p className="text-destructive text-sm">{validationError}</p> : null}
    </div>
  );
}

export function useReportDateFilterState() {
  const [draft, setDraft] = React.useState<ReportDateFilterState>(defaultReportDateFilter);
  const [applied, setApplied] = React.useState<ReportDateFilterState>(defaultReportDateFilter);

  return {
    draft,
    setDraft,
    applied,
    apply: () => setApplied(draft),
    reset: () => {
      const next = defaultReportDateFilter();
      setDraft(next);
      setApplied(next);
    },
  };
}
