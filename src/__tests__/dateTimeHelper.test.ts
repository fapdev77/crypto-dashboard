import { describe, it, expect } from 'vitest';
import {
  getStartOfTodayInMs,
  getEndOfTodayInMs,
  getStartOfMonthMs,
  getStartOfYearMs,
  getStrictCalendarStartTime,
  parseDateStartOfDay,
  parseDateEndOfDay,
  resolvePeriodDateRange,
  TIME_PERIOD_OPTIONS,
} from '../utils/dateTimeHelper';

describe('dateTimeHelper - Period & Calendar Date Functions', () => {
  // Use a fixed reference date: 2026-10-15 14:30:45.500
  const refDate = new Date(2026, 9, 15, 14, 30, 45, 500);

  it('calculates start of today (00:00:00.000) correctly', () => {
    const startMs = getStartOfTodayInMs(refDate);
    const d = new Date(startMs);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // October
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('calculates end of today (23:59:59.999) correctly', () => {
    const endMs = getEndOfTodayInMs(refDate);
    const d = new Date(endMs);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
    expect(d.getMilliseconds()).toBe(999);
  });

  it('calculates Month-to-Date (MTD) start correctly as 1st of month 00:00:00.000', () => {
    const mtdStartMs = getStartOfMonthMs(refDate);
    const d = new Date(mtdStartMs);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // October
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('calculates Year-to-Date (YTD) start correctly as Jan 1st 00:00:00.000', () => {
    const ytdStartMs = getStartOfYearMs(refDate);
    const d = new Date(ytdStartMs);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('calculates strict calendar start for N days', () => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    // 0 or negative returns undefined (All Time)
    expect(getStrictCalendarStartTime(0, refDate)).toBeUndefined();
    expect(getStrictCalendarStartTime(-1, refDate)).toBeUndefined();

    // 1 Day (Today): start of today
    const start1d = getStrictCalendarStartTime(ONE_DAY_MS, refDate);
    expect(start1d).toBe(getStartOfTodayInMs(refDate));

    // 7 Days: start of 6 days before today, covering 7 calendar days total
    const start7d = getStrictCalendarStartTime(7 * ONE_DAY_MS, refDate);
    const expected7d = getStartOfTodayInMs(refDate) - 6 * ONE_DAY_MS;
    expect(start7d).toBe(expected7d);

    const d7 = new Date(start7d!);
    expect(d7.getDate()).toBe(9); // Oct 15 - 6 = Oct 9
    expect(d7.getHours()).toBe(0);
  });

  it('parses YYYY-MM-DD into start of day and end of day accurately', () => {
    const start = parseDateStartOfDay('2026-05-10');
    expect(start).not.toBeNull();
    const dStart = new Date(start!);
    expect(dStart.getFullYear()).toBe(2026);
    expect(dStart.getMonth()).toBe(4); // May
    expect(dStart.getDate()).toBe(10);
    expect(dStart.getHours()).toBe(0);
    expect(dStart.getMinutes()).toBe(0);

    const end = parseDateEndOfDay('2026-05-10');
    expect(end).not.toBeNull();
    const dEnd = new Date(end!);
    expect(dEnd.getFullYear()).toBe(2026);
    expect(dEnd.getMonth()).toBe(4);
    expect(dEnd.getDate()).toBe(10);
    expect(dEnd.getHours()).toBe(23);
    expect(dEnd.getMinutes()).toBe(59);
    expect(dEnd.getSeconds()).toBe(59);
    expect(dEnd.getMilliseconds()).toBe(999);

    // Invalid input returns null
    expect(parseDateStartOfDay('')).toBeNull();
    expect(parseDateStartOfDay(undefined)).toBeNull();
    expect(parseDateStartOfDay('not-a-date')).toBeNull();
  });

  describe('resolvePeriodDateRange', () => {
    it('returns nulls for All Time (0, "0", "all", undefined)', () => {
      expect(resolvePeriodDateRange(0, undefined, undefined, refDate)).toEqual({ startTime: null, endTime: null });
      expect(resolvePeriodDateRange('0', undefined, undefined, refDate)).toEqual({ startTime: null, endTime: null });
      expect(resolvePeriodDateRange('all', undefined, undefined, refDate)).toEqual({ startTime: null, endTime: null });
      expect(resolvePeriodDateRange(undefined, undefined, undefined, refDate)).toEqual({ startTime: null, endTime: null });
    });

    it('resolves MTD (Month-to-Date)', () => {
      const res = resolvePeriodDateRange('mtd', undefined, undefined, refDate);
      expect(res.startTime).toBe(getStartOfMonthMs(refDate));
      expect(res.endTime).toBe(getEndOfTodayInMs(refDate));
    });

    it('resolves YTD (Year-to-Date)', () => {
      const res = resolvePeriodDateRange('ytd', undefined, undefined, refDate);
      expect(res.startTime).toBe(getStartOfYearMs(refDate));
      expect(res.endTime).toBe(getEndOfTodayInMs(refDate));
    });

    it('resolves Custom Date Range with start and end dates', () => {
      const res = resolvePeriodDateRange('custom', '2026-10-01', '2026-10-10', refDate);
      expect(res.startTime).toBe(parseDateStartOfDay('2026-10-01'));
      expect(res.endTime).toBe(parseDateEndOfDay('2026-10-10'));
      expect(res.startTime!).toBeLessThan(res.endTime!);
    });

    it('normalizes inverted Custom Date Range (start > end)', () => {
      const res = resolvePeriodDateRange('custom', '2026-10-20', '2026-10-05', refDate);
      expect(res.startTime).toBe(parseDateStartOfDay('2026-10-05'));
      expect(res.endTime).toBe(parseDateEndOfDay('2026-10-20'));
      expect(res.startTime!).toBeLessThan(res.endTime!);
    });

    it('resolves standard numeric ms durations with strict calendar day start', () => {
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const res7d = resolvePeriodDateRange(7 * ONE_DAY_MS, undefined, undefined, refDate);
      expect(res7d.startTime).toBe(getStrictCalendarStartTime(7 * ONE_DAY_MS, refDate));
      expect(res7d.endTime).toBe(getEndOfTodayInMs(refDate));
    });

    it('does not let lingering customStartDate/customEndDate hijack numeric presets like Today or 7 Days', () => {
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      // Even if customStartDate / customEndDate are passed, selecting 1 day (today) or 7 days must resolve to that preset
      const resToday = resolvePeriodDateRange(ONE_DAY_MS, '2026-01-01', '2026-01-10', refDate);
      expect(resToday.startTime).toBe(getStartOfTodayInMs(refDate));
      expect(resToday.endTime).toBe(getEndOfTodayInMs(refDate));

      const res7d = resolvePeriodDateRange(7 * ONE_DAY_MS, '2026-01-01', '2026-01-10', refDate);
      expect(res7d.startTime).toBe(getStrictCalendarStartTime(7 * ONE_DAY_MS, refDate));

      const resMtd = resolvePeriodDateRange('mtd', '2026-01-01', '2026-01-10', refDate);
      expect(resMtd.startTime).toBe(getStartOfMonthMs(refDate));

      const resAll = resolvePeriodDateRange(0, '2026-01-01', '2026-01-10', refDate);
      expect(resAll.startTime).toBeNull();
      expect(resAll.endTime).toBeNull();
    });
  });

  describe('TIME_PERIOD_OPTIONS structure and chronological ordering', () => {
    it('contains chronological presets ending with MTD, YTD, Custom, All Time', () => {
      const labels = TIME_PERIOD_OPTIONS.map(o => o.label);
      expect(labels).toEqual([
        'Today',
        '7 Days',
        '14 Days',
        '30 Days',
        '90 Days',
        '120 Days',
        '6 Months',
        '1 Year',
        'MTD',
        'YTD',
        'Custom Range...',
        'All Time',
      ]);
    });

    it('has custom range option marked with isCustom: true', () => {
      const customOpt = TIME_PERIOD_OPTIONS.find(o => o.value === 'custom');
      expect(customOpt).toBeDefined();
      expect(customOpt?.isCustom).toBe(true);
    });

    it('has MTD and YTD presets defined', () => {
      expect(TIME_PERIOD_OPTIONS.some(o => o.value === 'mtd')).toBe(true);
      expect(TIME_PERIOD_OPTIONS.some(o => o.value === 'ytd')).toBe(true);
    });
  });
});
