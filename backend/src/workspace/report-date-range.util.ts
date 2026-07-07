export const REPORT_DATE_PRESETS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
  'custom',
] as const;

export type ReportDatePreset = (typeof REPORT_DATE_PRESETS)[number];

export type ResolvedReportPeriod = {
  preset: ReportDatePreset;
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  label: string;
};

function zonedYmd(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function zonedTimeToUtc(ymd: string, time: string, timeZone: string): Date {
  const local = new Date(`${ymd}T${time}`);
  const utcDate = new Date(local.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(local.toLocaleString('en-US', { timeZone }));
  const offset = utcDate.getTime() - tzDate.getTime();
  return new Date(local.getTime() + offset);
}

function startOfZonedDay(ymd: string, timeZone: string): Date {
  return zonedTimeToUtc(ymd, '00:00:00.000', timeZone);
}

function endOfZonedDay(ymd: string, timeZone: string): Date {
  return zonedTimeToUtc(ymd, '23:59:59.999', timeZone);
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeekYmd(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonthYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function startOfQuarterYmd(ymd: string): string {
  const month = Number.parseInt(ymd.slice(5, 7), 10);
  const qStart = Math.floor((month - 1) / 3) * 3 + 1;
  return `${ymd.slice(0, 4)}-${String(qStart).padStart(2, '0')}-01`;
}

function startOfYearYmd(ymd: string): string {
  return `${ymd.slice(0, 4)}-01-01`;
}

function lastDayOfMonthYmd(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

function formatLabel(startDate: string, endDate: string): string {
  if (startDate === endDate) return startDate;
  return `${startDate} – ${endDate}`;
}

export function resolveReportPeriod(input: {
  preset?: string;
  startDate?: string;
  endDate?: string;
  timeZone: string;
}): ResolvedReportPeriod {
  const preset = (input.preset ?? 'this_month') as ReportDatePreset;
  const today = zonedYmd(new Date(), input.timeZone);

  let startDate: string;
  let endDate: string;

  switch (preset) {
    case 'today':
      startDate = today;
      endDate = today;
      break;
    case 'yesterday': {
      const y = addDaysYmd(today, -1);
      startDate = y;
      endDate = y;
      break;
    }
    case 'this_week':
      startDate = startOfWeekYmd(today);
      endDate = today;
      break;
    case 'last_week': {
      const thisWeekStart = startOfWeekYmd(today);
      const lastWeekEnd = addDaysYmd(thisWeekStart, -1);
      startDate = startOfWeekYmd(lastWeekEnd);
      endDate = lastWeekEnd;
      break;
    }
    case 'this_month':
      startDate = startOfMonthYmd(today);
      endDate = today;
      break;
    case 'last_month': {
      const prevMonthRef = addDaysYmd(startOfMonthYmd(today), -1);
      startDate = startOfMonthYmd(prevMonthRef);
      endDate = lastDayOfMonthYmd(prevMonthRef);
      break;
    }
    case 'this_quarter':
      startDate = startOfQuarterYmd(today);
      endDate = today;
      break;
    case 'this_year':
      startDate = startOfYearYmd(today);
      endDate = today;
      break;
    case 'custom':
      if (!input.startDate?.trim() || !input.endDate?.trim()) {
        throw new Error('Custom date range requires start and end dates.');
      }
      startDate = input.startDate.trim();
      endDate = input.endDate.trim();
      if (endDate < startDate) {
        throw new Error('End date cannot be earlier than start date.');
      }
      break;
    default:
      startDate = startOfMonthYmd(today);
      endDate = today;
  }

  return {
    preset,
    start: startOfZonedDay(startDate, input.timeZone),
    end: endOfZonedDay(endDate, input.timeZone),
    startDate,
    endDate,
    label: formatLabel(startDate, endDate),
  };
}
