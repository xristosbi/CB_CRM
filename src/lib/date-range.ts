import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";

export type DateRangePreset = "today" | "week" | "month" | "quarter" | "year" | "ytd" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Σήμερα" },
  { value: "week", label: "Αυτή την εβδομάδα" },
  { value: "month", label: "Αυτόν τον μήνα" },
  { value: "quarter", label: "3 μήνες" },
  { value: "year", label: "Έτος" },
  { value: "ytd", label: "Year to date" },
  { value: "custom", label: "Custom" },
];

export function computeDateRange(
  preset: DateRangePreset,
  custom: { from: string; to: string }
): DateRange {
  const now = new Date();

  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "quarter":
      return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "ytd":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "custom": {
      const from = custom.from ? startOfDay(new Date(custom.from)) : startOfMonth(now);
      const to = custom.to ? endOfDay(new Date(custom.to)) : endOfDay(now);
      return { start: from, end: to };
    }
  }
}

export function isWithinRange(dateLike: string, range: DateRange): boolean {
  const d = new Date(dateLike);
  return d >= range.start && d <= range.end;
}
