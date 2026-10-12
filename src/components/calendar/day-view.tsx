"use client";

import { useMemo } from "react";

import {
  athensParts,
  athensWallTimeToDate,
  formatAthensTime,
  isSameAthensDay,
} from "@/lib/calendar-tz";
import { CALENDAR_EVENT_TYPE_COLORS, CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar-event-types";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarTaskEntry } from "@/lib/types";
import { layoutDayEvents } from "./event-layout";
import { TaskRow } from "./event-pieces";
import {
  clampGridMinutes,
  DAY_START_HOUR,
  HOUR_HEIGHT_PX,
  minutesSinceGridStart,
  TOTAL_GRID_HOURS,
} from "./time-grid-constants";

const HOURS = Array.from({ length: TOTAL_GRID_HOURS }, (_, i) => DAY_START_HOUR + i);

export function DayView({
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
  const dayEvents = useMemo(
    () => events.filter((e) => isSameAthensDay(new Date(e.starts_at), anchorDate)),
    [events, anchorDate]
  );
  const dayTasks = useMemo(
    () => tasks.filter((t) => isSameAthensDay(new Date(t.due_at), anchorDate)),
    [tasks, anchorDate]
  );
  const positioned = useMemo(() => layoutDayEvents(dayEvents), [dayEvents]);
  const { year, month, day } = athensParts(anchorDate);

  return (
    <div className="flex h-full flex-col overflow-auto">
      {dayTasks.length > 0 && (
        <div className="flex flex-col gap-1.5 border-b p-3">
          {dayTasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTaskClick(t)}
              className="text-left"
            >
              <TaskRow task={t} />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[56px_1fr]">
        <div className="flex flex-col">
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT_PX }}
              className="border-b pr-2 text-right text-xs text-muted-foreground"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        <div className="relative border-l" style={{ height: HOUR_HEIGHT_PX * TOTAL_GRID_HOURS }}>
          {HOURS.map((h, i) => (
            <div
              key={h}
              role="button"
              tabIndex={0}
              onClick={() => onSlotClick(athensWallTimeToDate(year, month, day, h, 0))}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSlotClick(athensWallTimeToDate(year, month, day, h, 0));
              }}
              className="absolute inset-x-0 cursor-pointer border-b hover:bg-accent/40"
              style={{ top: i * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
            />
          ))}

          {positioned.map(({ event, col, cols }) => {
            const startMin = clampGridMinutes(minutesSinceGridStart(new Date(event.starts_at)));
            const endMin = clampGridMinutes(minutesSinceGridStart(new Date(event.ends_at)));
            const top = (startMin / 60) * HOUR_HEIGHT_PX;
            const height = Math.max(32, ((endMin - startMin) / 60) * HOUR_HEIGHT_PX);
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
                style={{ top, height, left: `${col * widthPct}%`, width: `${widthPct}%` }}
                className={cn(
                  "absolute overflow-hidden rounded border px-2 py-1 text-left text-xs leading-tight",
                  colors.bg,
                  colors.border,
                  colors.text
                )}
              >
                <span className="block font-medium">
                  {formatAthensTime(new Date(event.starts_at))}–
                  {formatAthensTime(new Date(event.ends_at))} · {CALENDAR_EVENT_TYPE_LABELS[event.type]}
                </span>
                <span className="block truncate font-semibold">{event.title}</span>
                {event.contact_name && <span className="block truncate">{event.contact_name}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
