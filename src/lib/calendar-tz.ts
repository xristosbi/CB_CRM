// Europe/Athens-aware date math, built on Intl (no date-fns-tz or other
// extra dependency). The calendar always displays/computes in Athens wall
// time, regardless of the viewer's own device timezone — a lead booked
// for "10:00" should read as 10:00 for everyone looking at the CRM.
export const ATHENS_TZ = "Europe/Athens";

const GREEK_MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

// Monday-first, matching the calendar's week layout.
const GREEK_WEEKDAYS = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
const GREEK_WEEKDAYS_SHORT = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];

export interface AthensParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Monday .. 6 = Sunday
}

function formatPartsMap(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: ATHENS_TZ, ...options });
  return Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
}

// Offset (minutes) of Europe/Athens from UTC at the given instant — varies
// with DST (EET/EEST), so this is computed per-call rather than hardcoded.
function offsetMinutesAt(date: Date): number {
  const parts = formatPartsMap(date, {
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second
  );
  return (asUTC - date.getTime()) / 60000;
}

export function athensParts(date: Date): AthensParts {
  const parts = formatPartsMap(date, {
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const civilUTC = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
  const jsDow = civilUTC.getUTCDay(); // 0 = Sun .. 6 = Sat
  const weekday = jsDow === 0 ? 6 : jsDow - 1; // 0 = Mon .. 6 = Sun
  return {
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +parts.hour,
    minute: +parts.minute,
    weekday,
  };
}

// Inverse of athensParts: the real UTC instant for a given Athens wall-clock
// civil time. One offset lookup is enough for scheduling purposes (the only
// edge case it can misjudge by an hour is a meeting booked inside the one
// skipped/repeated DST-transition hour itself).
export function athensWallTimeToDate(y: number, m: number, d: number, h = 0, mi = 0): Date {
  const guessUTC = Date.UTC(y, m - 1, d, h, mi);
  const offset = offsetMinutesAt(new Date(guessUTC));
  return new Date(guessUTC - offset * 60000);
}

export function startOfDayAthens(date: Date): Date {
  const { year, month, day } = athensParts(date);
  return athensWallTimeToDate(year, month, day, 0, 0);
}

export function addDaysAthens(date: Date, days: number): Date {
  const { year, month, day, hour, minute } = athensParts(date);
  const civil = new Date(Date.UTC(year, month - 1, day));
  civil.setUTCDate(civil.getUTCDate() + days);
  return athensWallTimeToDate(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate(), hour, minute);
}

export function startOfWeekAthens(date: Date): Date {
  const { weekday } = athensParts(date);
  return startOfDayAthens(addDaysAthens(date, -weekday));
}

// Used for month-navigation only — pins to day 1 of the target month so a
// start date near the end of a long month (e.g. Jan 31) can never overflow
// past the next month and silently skip it (Jan 31 + 1 month landing on Mar
// 3 would skip February entirely).
export function addMonthsAthens(date: Date, months: number): Date {
  const { year, month } = athensParts(date);
  const zeroBased = month - 1 + months;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12;
  return athensWallTimeToDate(newYear, newMonth + 1, 1, 0, 0);
}

export function startOfMonthAthens(date: Date): Date {
  const { year, month } = athensParts(date);
  return athensWallTimeToDate(year, month, 1, 0, 0);
}

export function isSameAthensDay(a: Date, b: Date): boolean {
  const pa = athensParts(a);
  const pb = athensParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function formatAthensTime(date: Date): string {
  const { hour, minute } = athensParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatAthensWeekdayShort(date: Date): string {
  return GREEK_WEEKDAYS_SHORT[athensParts(date).weekday];
}

export function formatAthensWeekdayLong(date: Date): string {
  return GREEK_WEEKDAYS[athensParts(date).weekday];
}

export function formatAthensMonthYear(date: Date): string {
  const { year, month } = athensParts(date);
  return `${GREEK_MONTHS[month - 1]} ${year}`;
}

export function formatAthensDateLong(date: Date): string {
  const { year, month, day } = athensParts(date);
  return `${day} ${GREEK_MONTHS[month - 1]} ${year}`;
}

export function formatAthensDayNum(date: Date): number {
  return athensParts(date).day;
}

// 6 rows x 7 cols (Mon-Sun), including the leading/trailing days from
// adjacent months needed to fill the grid.
export function buildMonthGrid(anchor: Date): Date[] {
  const monthStart = startOfMonthAthens(anchor);
  const gridStart = startOfWeekAthens(monthStart);
  return Array.from({ length: 42 }, (_, i) => addDaysAthens(gridStart, i));
}

export function buildWeekDays(anchor: Date): Date[] {
  const weekStart = startOfWeekAthens(anchor);
  return Array.from({ length: 7 }, (_, i) => addDaysAthens(weekStart, i));
}

export function isInAthensMonth(date: Date, anchor: Date): boolean {
  const d = athensParts(date);
  const a = athensParts(anchor);
  return d.year === a.year && d.month === a.month;
}

// <input type="date"> / <input type="time"> bind to Athens-local values so
// the form always reflects Athens time, not the browser's own timezone.
export function toDateInputValue(date: Date): string {
  const { year, month, day } = athensParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toTimeInputValue(date: Date): string {
  const { hour, minute } = athensParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseDateTimeInputsToDate(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  return athensWallTimeToDate(y, m, d, h, mi);
}
