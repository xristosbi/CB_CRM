"use client";

import { useMemo } from "react";

import {
  athensParts,
  athensWallTimeToDate,
  buildWeekDays,
  formatAthensDayNum,
  formatAthensTime,
  formatAthensWeekdayShort,
  isSameAthensDay,
} from "@/lib/calendar-tz";
import { CALENDAR_EVENT_TYPE_COLORS } from "@/lib/calendar-event-types";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarTaskEntry } from "@/lib/types";
import { layoutDayEvents } from "./event-layout";
import { TaskChip } from "./event-pieces";
import {
  clampGridMinutes,
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT_PX,
  minutesSinceGridStart,
  TOTAL_GRID_HOURS,
} from "./time-grid-constants";

const HOURS = Array.from({ length: TOTAL_GRID_HOURS }, (_, i) => DAY_START_HOUR + i);

export function WeekView({
  anchorDate,
  events,
  tasks,
  onSlotClick,
  onEventClick,
  onTaskClick,
}: {
  anchorDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTaskEntry[];
  onSlotClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: CalendarTaskEntry) => void;
}) {
  const days = useMemo(() => buildWeekDays(anchorDate), [anchorDate]);
  const today = useMemo(() => new Date(), []);

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="sticky top-0 z-10 grid grid-cols-[52px_repeat(7,1fr)] border-b bg-background">
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="flex flex-col items-center border-l p-1.5">
            <span className="text-[11px] text-muted-foreground">
              {formatAthensWeekdayShort(day)}
            </span>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-sm font-medium",
                isSameAthensDay(day, today) && "bg-primary text-primary-foreground"
              )}
            >
              {formatAthensDayNum(day)}
            </span>
            <div className="mt-0.5 flex w-full flex-col gap-0.5">
              {tasks
                .filter((t) => isSameAthensDay(new Date(t.due_at), day))
                .slice(0, 2)
                .map((t) => (
                  <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t)} />
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[52px_repeat(7,1fr)]">
        <div className="flex flex-col">
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT_PX }}
              className="border-b pr-1.5 text-right text-[10px] text-muted-foreground"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameAthensDay(new Date(e.starts_at), day));
          const positioned = layoutDayEvents(dayEvents);

          return (
            <div
              key={day.toISOString()}
              className="relative border-l"
              style={{ height: HOUR_HEIGHT_PX * TOTAL_GRID_HOURS }}
            >
              {HOURS.map((h, i) => {
                const { year, month, day: d } = athensParts(day);
                return (
                  <div
                    key={h}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSlotClick(athensWallTimeToDate(year, month, d, h, 0))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSlotClick(athensWallTimeToDate(year, month, d, h, 0));
                    }}
                    className="absolute inset-x-0 cursor-pointer border-b hover:bg-accent/40"
                    style={{ top: i * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
                  />
                );
              })}

              {positioned.map(({ event, col, cols }) => {
                const startMin = clampGridMinutes(minutesSinceGridStart(new Date(event.starts_at)));
                const endMin = clampGridMinutes(minutesSinceGridStart(new Date(event.ends_at)));
                const top = (startMin / 60) * HOUR_HEIGHT_PX;
                const height = Math.max(18, ((endMin - startMin) / 60) * HOUR_HEIGHT_PX);
                const colors = CALENDAR_EVENT_TYPE_COLORS[event.type];
                const widthPct = 100 / cols;

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    title={event.title}
                    style={{
                      top,
                      height,
                      left: `${col * widthPct}%`,
                      width: `${widthPct}%`,
                    }}
                    className={cn(
                      "absolute overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] leading-tight",
                      colors.bg,
                      colors.border,
                      colors.text
                    )}
                  >
                    <span className="block font-medium">{formatAthensTime(new Date(event.starts_at))}</span>
                    <span className="block truncate">{event.title}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="px-2 py-2 text-center text-[11px] text-muted-foreground">
        Εμφανίζονται ραντεβού {DAY_START_HOUR}:00–{DAY_END_HOUR}:00. Ραντεβού εκτός αυτού του
        εύρους εμφανίζονται στην αρχή/τέλος της στήλης.
      </p>
    </div>
  );
}
