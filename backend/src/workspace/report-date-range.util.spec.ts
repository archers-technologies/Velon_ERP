import { resolveReportPeriod } from './report-date-range.util';

describe('report-date-range.util', () => {
  it('resolves custom range with validation-friendly dates', () => {
    const period = resolveReportPeriod({
      preset: 'custom',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      timeZone: 'Asia/Kolkata',
    });
    expect(period.startDate).toBe('2026-06-01');
    expect(period.endDate).toBe('2026-06-30');
    expect(period.start.getTime()).toBeLessThan(period.end.getTime());
  });

  it('rejects end date before start date', () => {
    expect(() =>
      resolveReportPeriod({
        preset: 'custom',
        startDate: '2026-06-30',
        endDate: '2026-06-01',
        timeZone: 'UTC',
      }),
    ).toThrow('End date cannot be earlier than start date.');
  });

  it('defaults to this month preset', () => {
    const period = resolveReportPeriod({ timeZone: 'UTC' });
    expect(period.preset).toBe('this_month');
    expect(period.endDate.length).toBe(10);
  });
});
