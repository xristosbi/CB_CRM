import { athensParts } from "@/lib/calendar-tz";

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;
export const TOTAL_GRID_HOURS = DAY_END_HOUR - DAY_START_HOUR;
export const HOUR_HEIGHT_PX = 56;

export function minutesSinceGridStart(date: Date): number {
  const { hour, minute } = athensParts(date);
  return (hour - DAY_START_HOUR) * 60 + minute;
}

export function clampGridMinutes(minutes: number): number {
  return Math.max(0, Math.min(TOTAL_GRID_HOURS * 60, minutes));
}
