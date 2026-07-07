import { useCallback, useEffect, useState } from "react";
import { DEFAULT_TIMEZONE, formatDateTimeWithSecondsInTimezone, ordinalSuffix } from "@/lib/timezone";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export function useTimezone(): string {
  const [tz, setTz] = useState(DEFAULT_TIMEZONE);

  useEffect(() => {
    const cookie = getCookie("tz");
    if (cookie) setTz(cookie);
  }, []);

  return tz;
}

export function useFormatDateInTimezone() {
  const tz = useTimezone();

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("id-ID", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        ...options,
      });
    },
    [tz]
  );

  const formatDateTime = useCallback(
    (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleString("id-ID", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [tz]
  );

  const formatDateTimeWithSeconds = useCallback(
    (date: Date | string) => formatDateTimeWithSecondsInTimezone(date, tz),
    [tz]
  );

  return { formatDate, formatDateTime, formatDateTimeWithSeconds, timezone: tz };
}

export function FormattedDateTime({ date, timezone }: { date: Date | string; timezone?: string }) {
  const cookieTz = useTimezone();
  const tz = timezone || cookieTz;
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
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
  return <>{get("weekday")}, {get("month")} {day}<sup>{suffix}</sup>, {get("year")} at {get("hour")}:{get("minute")}:{get("second")}</>;
}
