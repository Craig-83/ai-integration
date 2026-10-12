import type { DayIndex } from "./types";

const DAY_MS = 86_400_000;

function parse(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  return new Date(parse(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b) - parse(a)) / DAY_MS);
}

export function shiftDate(weekStart: string, day: DayIndex): string {
  return addDays(weekStart, day);
}

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string, withYear = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export function formatTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatRange(start: number, end: number): string {
  return `${formatTime(start)} to ${formatTime(end)}`;
}

/** Victorian public holidays (business.vic.gov.au, checked 12 Oct 2026). */
export const VIC_PUBLIC_HOLIDAYS: Record<string, string> = {
  "2026-11-03": "Melbourne Cup Day",
  "2026-12-25": "Christmas Day",
  "2026-12-26": "Boxing Day",
  "2026-12-28": "Boxing Day (additional)",
  "2027-01-01": "New Year's Day",
  "2027-01-26": "Australia Day",
  "2027-03-08": "Labour Day",
  "2027-03-26": "Good Friday",
  "2027-03-27": "Saturday before Easter Sunday",
  "2027-03-28": "Easter Sunday",
  "2027-03-29": "Easter Monday",
  "2027-04-25": "ANZAC Day",
  "2027-06-14": "King's Birthday",
  "2027-11-02": "Melbourne Cup Day",
  "2027-12-25": "Christmas Day",
  "2027-12-26": "Boxing Day",
  "2027-12-27": "Christmas Day (additional)",
  "2027-12-28": "Boxing Day (additional)",
};

export function publicHoliday(iso: string): string | undefined {
  return VIC_PUBLIC_HOLIDAYS[iso];
}
