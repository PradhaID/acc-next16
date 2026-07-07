export const DEFAULT_TIMEZONE = "Asia/Jakarta";

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "Asia/Jakarta", label: "Jakarta (WIB)", offset: "UTC+07:00" },
  { value: "Asia/Pontianak", label: "Pontianak (WIB)", offset: "UTC+07:00" },
  { value: "Asia/Makassar", label: "Makassar (WITA)", offset: "UTC+08:00" },
  { value: "Asia/Jayapura", label: "Jayapura (WIT)", offset: "UTC+09:00" },
  { value: "Asia/Singapore", label: "Singapore", offset: "UTC+08:00" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur", offset: "UTC+08:00" },
  { value: "Asia/Bangkok", label: "Bangkok", offset: "UTC+07:00" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh", offset: "UTC+07:00" },
  { value: "Asia/Manila", label: "Manila", offset: "UTC+08:00" },
  { value: "Asia/Tokyo", label: "Tokyo", offset: "UTC+09:00" },
  { value: "Asia/Seoul", label: "Seoul", offset: "UTC+09:00" },
  { value: "Asia/Shanghai", label: "Shanghai", offset: "UTC+08:00" },
  { value: "Asia/Hong_Kong", label: "Hong Kong", offset: "UTC+08:00" },
  { value: "Asia/Taipei", label: "Taipei", offset: "UTC+08:00" },
  { value: "Asia/Kolkata", label: "India (IST)", offset: "UTC+05:30" },
  { value: "Asia/Dubai", label: "Dubai", offset: "UTC+04:00" },
  { value: "Europe/London", label: "London", offset: "UTC+00:00" },
  { value: "Europe/Paris", label: "Paris", offset: "UTC+01:00" },
  { value: "Europe/Berlin", label: "Berlin", offset: "UTC+01:00" },
  { value: "America/New_York", label: "New York", offset: "UTC-05:00" },
  { value: "America/Chicago", label: "Chicago", offset: "UTC-06:00" },
  { value: "America/Denver", label: "Denver", offset: "UTC-07:00" },
  { value: "America/Los_Angeles", label: "Los Angeles", offset: "UTC-08:00" },
  { value: "Pacific/Auckland", label: "Auckland", offset: "UTC+12:00" },
  { value: "Australia/Sydney", label: "Sydney", offset: "UTC+10:00" },
  { value: "Australia/Perth", label: "Perth", offset: "UTC+08:00" },
];

export function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export function formatDateTimeWithSecondsInTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const day = Number(get("day"));
  const suffix = ordinalSuffix(day);
  return `${get("weekday")}, ${get("month")} ${day}${suffix}, ${get("year")} at ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Convert a YYYY-MM-DD local date string to the UTC Date for start of that local day */
export function localDateStartUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Convert a YYYY-MM-DD local date string to the UTC Date for end of that local day */
export function localDateEndUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function formatDateInTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  });
}

export function formatDateTimeInTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("id-ID", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
