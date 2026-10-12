"use client";

import { useMemo } from "react";

import {
  addDaysAthens,
  formatAthensDateLong,
  formatAthensWeekdayLong,
  isSameAthensDay,
  startOfDayAthens,
} from "@/lib/calendar-tz";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarTaskEntry } from "@/lib/types";
import { EventRow, TaskRow } from "./event-pieces";

export const AGENDA_WINDOW_DAYS = 14;

export function AgendaView({
  anchorDate,
  events,
  tasks,
  onEventClick,
}: {
  anchorDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTaskEntry[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const days = useMemo(() => {
    const start = startOfDayAthens(anchorDate);
    return Array.from({ length: AGENDA_WINDOW_DAYS }, (_, i) => addDaysAthens(start, i));
  }, [anchorDate]);
  const today = useMemo(() => new Date(), []);

  const groups = useMemo(
    () =>
      days.map((day) => ({
        day,
        events: events
          .filter((e) => isSameAthensDay(new Date(e.starts_at), day))
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
        tasks: tasks.filter((t) => isSameAthensDay(new Date(t.due_at), day)),
      })),
    [days, events, tasks]
  );

  const hasAnything = groups.some((g) => g.events.length > 0 || g.tasks.length > 0);

  return (
    <div className="flex flex-col gap-4 p-3">
      {!hasAnything && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Δεν υπάρχουν ραντεβού ή tasks τις επόμενες {AGENDA_WINDOW_DAYS} μέρες.
        </p>
      )}
      {groups
        .filter((g) => g.events.length > 0 || g.tasks.length > 0)
        .map((group) => (
          <div key={group.day.toISOString()} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-sm font-semibold",
                  isSameAthensDay(group.day, today) && "text-primary"
                )}
              >
                {formatAthensWeekdayLong(group.day)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatAthensDateLong(group.day)}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {group.events.map((event) => (
                <EventRow key={event.id} event={event} onEdit={() => onEventClick(event)} />
              ))}
              {group.tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
