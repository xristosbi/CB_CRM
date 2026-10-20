"use client";

import Link from "next/link";
import { CheckSquare, Phone, Square } from "lucide-react";

import {
  CALENDAR_EVENT_TYPE_COLORS,
  CALENDAR_EVENT_TYPE_LABELS,
} from "@/lib/calendar-event-types";
import { formatAthensTime } from "@/lib/calendar-tz";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/users/user-avatar";
import type { CalendarEvent, CalendarTaskEntry } from "@/lib/types";

// Compact chip for Month/Week/Day grid cells.
export function EventChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const colors = CALENDAR_EVENT_TYPE_COLORS[event.type];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${event.title} — ${formatAthensTime(new Date(event.starts_at))}`}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded border px-1 py-0.5 text-left text-[11px]",
        colors.bg,
        colors.border,
        colors.text
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", colors.dot)} />
      <span className="shrink-0 font-medium">{formatAthensTime(new Date(event.starts_at))}</span>
      <span className="truncate">{event.title}</span>
    </button>
  );
}

export function TaskChip({ task, onClick }: { task: CalendarTaskEntry; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={task.title}
      className="flex w-full min-w-0 items-center gap-1 rounded border border-dashed border-border px-1 py-0.5 text-left text-[11px] text-muted-foreground"
    >
      {task.done ? (
        <CheckSquare className="size-3 shrink-0" />
      ) : (
        <Square className="size-3 shrink-0" />
      )}
      <span className="truncate">{task.title}</span>
    </button>
  );
}

// Richer row used by Agenda/Day views: contact as a link to their contact
// card, plus a tel: call button.
export function EventRow({ event, onEdit }: { event: CalendarEvent; onEdit: () => void }) {
  const colors = CALENDAR_EVENT_TYPE_COLORS[event.type];
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3", colors.border, colors.bg)}>
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", colors.dot)} />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {formatAthensTime(start)}–{formatAthensTime(end)}
          </span>
          <span className={cn("text-xs font-medium", colors.text)}>
            {CALENDAR_EVENT_TYPE_LABELS[event.type]}
          </span>
          <UserAvatar
            user={
              event.assigned_to
                ? { id: event.assigned_to, display_name: event.assigned_to_name, color: null }
                : null
            }
            size="sm"
          />
        </div>
        <p className="mt-0.5 truncate text-sm font-medium">{event.title}</p>
        {event.notes && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.notes}</p>
        )}
      </button>
      {event.contact_id && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Link
            href={`/contacts/${event.contact_id}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate text-xs font-medium hover:underline"
          >
            {event.contact_name}
          </Link>
          {event.contact_phone && (
            <a
              href={`tel:${event.contact_phone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Phone className="size-3" />
              Κλήση
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskRow({ task }: { task: CalendarTaskEntry }) {
  return (
    <Link
      href={`/contacts/${task.contact_id}`}
      className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2.5 text-sm hover:bg-accent"
    >
      {task.done ? (
        <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <Square className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      <span className="shrink-0 truncate text-xs text-muted-foreground">{task.contact_name}</span>
    </Link>
  );
}
