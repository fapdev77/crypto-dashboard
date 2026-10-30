/**
 * Helper utility for standardizing date and time formatting across the application.
 * Supports locale-aware user display formatting (24-hour clock) as well as standardized ISO date representations.
 */

export interface FormatDateTimeOptions {
  /** Optional locale string (e.g., 'pt-BR', 'en-US'). If omitted, defaults to the browser locale. */
  locale?: string;
  /** Whether to include seconds in the time formatting. Default: true. */
  includeSeconds?: boolean;
  /** Whether to include the year in the date formatting. Default: true. */
  includeYear?: boolean;
  /** Format pattern for month in locale formatting ('numeric', '2-digit', 'short', 'long'). Default: '2-digit'. */
  monthFormat?: 'numeric' | '2-digit' | 'short' | 'long';
  /** Timezone to use for formatting (e.g. 'UTC'). If omitted, uses local timezone. */
  timeZone?: string;
}

export interface FormattedDateTimeResult {
  dateStr: string;
  timeStr: string;
  fullStr: string;
}

/**
 * Formats a Unix timestamp (ms), ISO string, or Date object into user's locale format with 24-hour time.
 *
 * @param timeInput - Timestamp in ms, ISO date string, or Date object.
 * @param options - Optional configuration for locale, seconds, year, month format, timezone.
 * @returns An object containing dateStr, timeStr, and fullStr.
 */
export function formatDateTime(
  timeInput: number | string | Date | undefined | null,
  options: FormatDateTimeOptions = {}
): FormattedDateTimeResult {
  if (timeInput === undefined || timeInput === null || timeInput === '') {
    return { dateStr: '--', timeStr: '--', fullStr: '--' };
  }

  let date: Date;
  if (timeInput instanceof Date) {
    date = timeInput;
  } else if (typeof timeInput === 'number') {
    date = new Date(timeInput);
  } else {
    const numeric = Number(timeInput);
    if (!isNaN(numeric) && timeInput.trim() !== '') {
      date = new Date(numeric);
    } else {
      date = new Date(timeInput);
    }
  }

  if (isNaN(date.getTime())) {
    return { dateStr: '--', timeStr: '--', fullStr: '--' };
  }

  const currentLocale = options.locale || undefined;
  const includeSeconds = options.includeSeconds ?? true;
  const includeYear = options.includeYear ?? true;
  const monthFormat = options.monthFormat ?? '2-digit';
  const timeZone = options.timeZone || undefined;

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: monthFormat,
    day: '2-digit',
    timeZone,
  };

  if (includeYear) {
    dateOptions.year = 'numeric';
  }

  const dateStr = date.toLocaleDateString(currentLocale, dateOptions);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  };

  if (includeSeconds) {
    timeOptions.second = '2-digit';
  }

  const timeStr = date.toLocaleTimeString(currentLocale, timeOptions);

  return {
    dateStr,
    timeStr,
    fullStr: `${dateStr} ${timeStr}`,
  };
}

/**
 * Convenience helper to get the full formatted date and time string.
 */
export function formatFullDateTime(
  timeInput: number | string | Date | undefined | null,
  options?: FormatDateTimeOptions
): string {
  return formatDateTime(timeInput, options).fullStr;
}

/**
 * Convenience helper to get only the formatted date string.
 */
export function formatDateOnly(
  timeInput: number | string | Date | undefined | null,
  options?: FormatDateTimeOptions
): string {
  return formatDateTime(timeInput, options).dateStr;
}

/**
 * Convenience helper to get only the formatted time string.
 */
export function formatTimeOnly(
  timeInput: number | string | Date | undefined | null,
  options?: FormatDateTimeOptions
): string {
  return formatDateTime(timeInput, options).timeStr;
}

/**
 * Helper to format time in UTC timezone with 24-hour format.
 */
export function formatTimeUTC(
  timeInput: number | string | Date | undefined | null,
  includeSeconds = false
): string {
  return formatDateTime(timeInput, {
    timeZone: 'UTC',
    includeSeconds,
  }).timeStr;
}

/**
 * Helper for technical ISO / API / file export formatting (e.g., 'yyyy-MM-dd HH:mm:ss').
 * Keeps strict ISO machine-readable standards for backend filters, log tags, export filenames.
 */
export function formatIsoDateTime(
  timeInput: number | string | Date | undefined | null,
  includeTime = true,
  includeSeconds = true
): string {
  if (timeInput === undefined || timeInput === null || timeInput === '') {
    return '--';
  }
  
  let date: Date;
  if (timeInput instanceof Date) {
    date = timeInput;
  } else if (typeof timeInput === 'number') {
    date = new Date(timeInput);
  } else {
    const numeric = Number(timeInput);
    if (!isNaN(numeric) && timeInput.trim() !== '') {
      date = new Date(numeric);
    } else {
      date = new Date(timeInput);
    }
  }

  if (isNaN(date.getTime())) return '--';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (!includeTime) {
    return `${year}-${month}-${day}`;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (!includeSeconds) {
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a relative time string (e.g., "5m ago", "in 12m", "just now").
 */
export function timeAgo(ts: number | undefined | null): string {
  if (!ts) return '--';
  const diff = Date.now() - ts;
  if (diff < 1000 && diff > -1000) return 'just now';

  const isFuture = diff < 0;
  const absSec = Math.floor(Math.abs(diff) / 1000);

  if (absSec < 60) {
    return isFuture ? `in ${absSec}s` : `${absSec}s ago`;
  }
  const absMin = Math.floor(absSec / 60);
  if (absMin < 60) {
    return isFuture ? `in ${absMin}m` : `${absMin}m ago`;
  }
  const absHour = Math.floor(absMin / 60);
  if (absHour < 24) {
    return isFuture ? `in ${absHour}h` : `${absHour}h ago`;
  }
  const absDay = Math.floor(absHour / 24);
  return isFuture ? `in ${absDay}d` : `${absDay}d ago`;
}

/**
 * Returns the Unix timestamp (ms) for the start of today (00:00:00.000) in local timezone.
 */
export function getStartOfTodayInMs(refDate?: Date): number {
  const now = refDate || new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
}

/**
 * Returns the Unix timestamp (ms) for the end of today (23:59:59.999) in local timezone.
 */
export function getEndOfTodayInMs(refDate?: Date): number {
  const now = refDate || new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
}

/**
 * Returns the Unix timestamp (ms) for the start of the current month (day 1, 00:00:00.000) in local timezone.
 * Used for Month-to-Date (MTD) filtering.
 */
export function getStartOfMonthMs(refDate?: Date): number {
  const now = refDate || new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
}

/**
 * Returns the Unix timestamp (ms) for the start of the current year (Jan 1, 00:00:00.000) in local timezone.
 * Used for Year-to-Date (YTD) filtering.
 */
export function getStartOfYearMs(refDate?: Date): number {
  const now = refDate || new Date();
  return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
}

/**
 * Returns an object containing startMs and endMs for today in local timezone.
 */
export function getTodayRange(): { startMs: number; endMs: number } {
  return {
    startMs: getStartOfTodayInMs(),
    endMs: getEndOfTodayInMs(),
  };
}

/**
 * Calculates the start timestamp (in ms) for strict calendar periods.
 * - timePeriodMs <= 0 or undefined: returns undefined (All Time, no start boundary).
 * - 1 day (e.g., 24 * 60 * 60 * 1000 for "Today"): returns 00:00:00.000 of today.
 * - N days: returns 00:00:00.000 of (N - 1) days before today, covering exactly N calendar days ending today.
 *
 * @param timePeriodMs - Duration in milliseconds (e.g., 24h, 7d, 30d) or 0 for All Time.
 * @param refDate - Optional reference date (defaults to current time).
 * @returns Start timestamp in milliseconds, or undefined if no time filter.
 */
export function getStrictCalendarStartTime(timePeriodMs: number | undefined, refDate?: Date): number | undefined {
  if (!timePeriodMs || timePeriodMs <= 0) return undefined;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const days = Math.round(timePeriodMs / ONE_DAY_MS);
  const startToday = getStartOfTodayInMs(refDate);
  if (days <= 1) {
    return startToday;
  }
  return startToday - (days - 1) * ONE_DAY_MS;
}

export interface TimePeriodOption {
  value: string;
  label: string;
  ms?: number;
  tooltip?: string;
  isCustom?: boolean;
}

/**
 * Centralized list of time period presets in chronological order:
 * Today, 7D, 14D, 30D, 90D, 120D, 6M, 1Y, MTD, YTD, Custom Range, All Time.
 */
export const TIME_PERIOD_OPTIONS: TimePeriodOption[] = [
  { value: String(24 * 60 * 60 * 1000), label: 'Today', ms: 24 * 60 * 60 * 1000, tooltip: 'Current calendar day (from 00:00:00 today)' },
  { value: String(7 * 24 * 60 * 60 * 1000), label: '7 Days', ms: 7 * 24 * 60 * 60 * 1000, tooltip: 'Last 7 calendar days' },
  { value: String(14 * 24 * 60 * 60 * 1000), label: '14 Days', ms: 14 * 24 * 60 * 60 * 1000, tooltip: 'Last 14 calendar days' },
  { value: String(30 * 24 * 60 * 60 * 1000), label: '30 Days', ms: 30 * 24 * 60 * 60 * 1000, tooltip: 'Last 30 calendar days' },
  { value: String(90 * 24 * 60 * 60 * 1000), label: '90 Days', ms: 90 * 24 * 60 * 60 * 1000, tooltip: 'Last 90 calendar days' },
  { value: String(120 * 24 * 60 * 60 * 1000), label: '120 Days', ms: 120 * 24 * 60 * 60 * 1000, tooltip: 'Last 120 calendar days' },
  { value: String(180 * 24 * 60 * 60 * 1000), label: '6 Months', ms: 180 * 24 * 60 * 60 * 1000, tooltip: 'Last 6 calendar months (~180 days)' },
  { value: String(365 * 24 * 60 * 60 * 1000), label: '1 Year', ms: 365 * 24 * 60 * 60 * 1000, tooltip: 'Last 1 calendar year (365 days)' },
  { value: 'mtd', label: 'MTD', tooltip: 'Month-to-Date: from the 1st of the current month to today' },
  { value: 'ytd', label: 'YTD', tooltip: 'Year-to-Date: from January 1st of the current year to today' },
  { value: 'custom', label: 'Custom Range...', isCustom: true, tooltip: 'Choose specific start and end calendar dates' },
  { value: '0', label: 'All Time', ms: 0, tooltip: 'Entire transaction and performance history' },
];

export interface ResolvedDateRange {
  startTime: number | null;
  endTime: number | null;
}

/**
 * Parses a date string formatted as 'YYYY-MM-DD' or ISO timestamp into start-of-day ms (00:00:00.000).
 */
export function parseDateStartOfDay(dateStr: string | undefined | null): number | null {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month, day, 0, 0, 0, 0);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0).getTime();
  }
  return null;
}

/**
 * Parses a date string formatted as 'YYYY-MM-DD' or ISO timestamp into end-of-day ms (23:59:59.999).
 */
export function parseDateEndOfDay(dateStr: string | undefined | null): number | null {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month, day, 23, 59, 59, 999);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 23, 59, 59, 999).getTime();
  }
  return null;
}

/**
 * Resolves any time period filter selection (ms number, 'mtd', 'ytd', 'custom', 'all')
 * into an absolute { startTime, endTime } timestamp boundaries object.
 *
 * @param timePeriod - Duration in ms (as number or string), or preset key ('mtd', 'ytd', 'custom', '0', 'all')
 * @param customStartDate - Optional 'YYYY-MM-DD' start date for custom range
 * @param customEndDate - Optional 'YYYY-MM-DD' end date for custom range
 * @param refDate - Optional reference date for testing/simulations (defaults to now)
 */
export function resolvePeriodDateRange(
  timePeriod: number | string | undefined | null,
  customStartDate?: string,
  customEndDate?: string,
  refDate?: Date
): ResolvedDateRange {
  const periodStr = String(timePeriod ?? '0').toLowerCase().trim();

  // 1. All Time
  if (periodStr === '0' || periodStr === 'all' || periodStr === '') {
    return { startTime: null, endTime: null };
  }

  // 2. Month-to-Date (MTD)
  if (periodStr === 'mtd') {
    return {
      startTime: getStartOfMonthMs(refDate),
      endTime: getEndOfTodayInMs(refDate),
    };
  }

  // 3. Year-to-Date (YTD)
  if (periodStr === 'ytd') {
    return {
      startTime: getStartOfYearMs(refDate),
      endTime: getEndOfTodayInMs(refDate),
    };
  }

  // 4. Custom Date Range (strictly when selected or when period is not specified)
  if (periodStr === 'custom' || ((periodStr === '' || periodStr === 'undefined') && (customStartDate || customEndDate))) {
    let startMs = parseDateStartOfDay(customStartDate);
    let endMs = parseDateEndOfDay(customEndDate);

    // If both dates are provided and start > end, swap or normalize
    if (startMs !== null && endMs !== null && startMs > endMs) {
      const temp = startMs;
      startMs = parseDateStartOfDay(customEndDate);
      endMs = parseDateEndOfDay(customStartDate);
    }

    return {
      startTime: startMs,
      endTime: endMs,
    };
  }

  // 5. Numeric duration in milliseconds (e.g., 24h, 7d, 30d...)
  const numericMs = Number(periodStr);
  if (!isNaN(numericMs) && numericMs > 0) {
    const startMs = getStrictCalendarStartTime(numericMs, refDate) ?? null;
    return {
      startTime: startMs,
      endTime: getEndOfTodayInMs(refDate),
    };
  }

  return { startTime: null, endTime: null };
}
