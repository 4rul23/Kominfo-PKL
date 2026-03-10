const APP_TIMEZONE = "Asia/Makassar";
const MAKASSAR_UTC_OFFSET_HOURS = 8;

type DateParts = { year: number; month: number; day: number };

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value || 0);
  const month = Number(parts.find((part) => part.type === "month")?.value || 0);
  const day = Number(parts.find((part) => part.type === "day")?.value || 0);

  return { year, month, day };
}

export function getAppDateKey(date: Date = new Date()): string {
  const { year, month, day } = getDatePartsInTimeZone(date, APP_TIMEZONE);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getAppDayUtcRange(date: Date = new Date()): { dayStartUtc: Date; nextDayStartUtc: Date } {
  const { year, month, day } = getDatePartsInTimeZone(date, APP_TIMEZONE);
  const utcStartMs = Date.UTC(year, month - 1, day, -MAKASSAR_UTC_OFFSET_HOURS, 0, 0, 0);
  const dayStartUtc = new Date(utcStartMs);
  const nextDayStartUtc = new Date(utcStartMs + 24 * 60 * 60 * 1000);
  return { dayStartUtc, nextDayStartUtc };
}

export function getAppTimeZone(): string {
  return APP_TIMEZONE;
}
