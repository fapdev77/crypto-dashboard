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
