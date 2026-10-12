"use client";

import { useMemo } from "react";

import {
  athensParts,
  athensWallTimeToDate,
  buildMonthGrid,
  formatAthensDayNum,
  isInAthensMonth,
  isSameAthensDay,
} from "@/lib/calendar-tz";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarTaskEntry } from "@/lib/types";
import { EventChip, TaskChip } from "./event-pieces";

const WEEKDAY_HEADERS = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];

export function MonthView({
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
  const days = useMemo(() => buildMonthGrid(anchorDate), [anchorDate]);
  const today = useMemo(() => new Date(), []);

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 gap-px border-b bg-border text-center">
        {WEEKDAY_HEADERS.map((h) => (
          <div key={h} className="bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {h}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-px bg-border">
        {days.map((day) => {
          const dayEvents = events
            .filter((e) => isSameAthensDay(new Date(e.starts_at), day))
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          const dayTasks = tasks.filter((t) => isSameAthensDay(new Date(t.due_at), day));
          const inMonth = isInAthensMonth(day, anchorDate);
          const isToday = isSameAthensDay(day, today);
          const visibleEvents = dayEvents.slice(0, 3);
          const extra = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => {
                const { year, month, day: d } = athensParts(day);
                onSlotClick(athensWallTimeToDate(year, month, d, 10, 0));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const { year, month, day: d } = athensParts(day);
                  onSlotClick(athensWallTimeToDate(year, month, d, 10, 0));
                }
              }}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-0.5 bg-background p-1 text-left",
                !inMonth && "bg-muted/40 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "self-start rounded px-1.5 text-xs",
                  isToday && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {formatAthensDayNum(day)}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visibleEvents.map((e) => (
                  <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />
                ))}
                {dayTasks.slice(0, 2).map((t) => (
                  <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t)} />
                ))}
                {extra > 0 && (
                  <span className="px-1 text-[10px] text-muted-foreground">+{extra} ακόμα</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

