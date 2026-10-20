"use client";

import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, MoreVertical, Pencil, Phone, PhoneOff, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/users/user-avatar";
import { formatAthensDateLong, formatAthensTime } from "@/lib/calendar-tz";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { LastContactInfo } from "@/lib/queries/leads";
import type { OpportunityCard as OpportunityCardData, Profile } from "@/lib/types";

const currency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function OpportunityCard({
  opportunity,
  nextAppointmentAt,
  lastContact,
  profiles,
  onQuickCall,
  onQuickNote,
  onEdit,
  onDelete,
  onAssign,
}: {
  opportunity: OpportunityCardData;
  nextAppointmentAt?: string | null;
  lastContact?: LastContactInfo | null;
  profiles: Profile[];
  onQuickCall: (opportunity: OpportunityCardData) => void;
  onQuickNote: (opportunity: OpportunityCardData) => void;
  onEdit: (opportunity: OpportunityCardData) => void;
  onDelete: (opportunity: OpportunityCardData) => void;
  onAssign: (opportunity: OpportunityCardData, userId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { type: "card", stageId: opportunity.stage_id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none rounded-lg border bg-card p-2 shadow-sm",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <Link
          href={`/contacts/${opportunity.contact_id}`}
          className="min-w-0 flex-1 text-sm leading-tight font-medium hover:underline"
        >
          <span className="block truncate">{opportunity.contact_name}</span>
        </Link>
        <div className="-mt-1 -mr-1 flex shrink-0 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label="Επιλογές lead"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(opportunity)}>
                <Pencil className="size-4" />
                Επεξεργασία
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(opportunity)}>
                <Trash2 className="size-4" />
                Διαγραφή
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            aria-label="Μετακίνηση κάρτας"
            className="cursor-grab touch-none rounded p-1 text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.5" />
              <circle cx="2" cy="8" r="1.5" />
              <circle cx="2" cy="14" r="1.5" />
              <circle cx="10" cy="2" r="1.5" />
              <circle cx="10" cy="8" r="1.5" />
              <circle cx="10" cy="14" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {opportunity.source && (
            <Badge variant="secondary" className="text-[11px]">
              {opportunity.source}
            </Badge>
          )}
          {opportunity.value != null && (
            <span className="text-xs font-medium text-muted-foreground">
              {currency.format(opportunity.value)}
            </span>
          )}
        </div>
        <div className="-mr-1 flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Καταγραφή κλήσης"
            onClick={() => onQuickCall(opportunity)}
          >
            <Phone className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Προσθήκη σημείωσης"
            onClick={() => onQuickNote(opportunity)}
          >
            <StickyNote className="size-3.5" />
          </Button>
        </div>
      </div>

      {nextAppointmentAt && (
        <div
          className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground"
          title={`Επόμενο ραντεβού: ${formatAthensDateLong(new Date(nextAppointmentAt))} ${formatAthensTime(new Date(nextAppointmentAt))}`}
        >
          <CalendarClock className="size-3 shrink-0" />
          <span className="truncate">
            {formatAthensDateLong(new Date(nextAppointmentAt))} ·{" "}
            {formatAthensTime(new Date(nextAppointmentAt))}
          </span>
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        {lastContact ? (
          <span
            className="flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground"
            title={`${lastContact.user_name ?? "Σύστημα"} · ${formatRelativeTime(lastContact.created_at)}`}
          >
            <Phone className="size-3 shrink-0" />
            <span className="truncate">
              {lastContact.user_name ?? "Σύστημα"} · {formatRelativeTime(lastContact.created_at)}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <PhoneOff className="size-3 shrink-0" />
            Χωρίς επαφή
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Ανάθεση lead" className="shrink-0 rounded-full">
              <UserAvatar
                user={
                  opportunity.assigned_to
                    ? { id: opportunity.assigned_to, display_name: opportunity.assigned_to_name, color: null }
                    : null
                }
                size="sm"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {profiles.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => onAssign(opportunity, p.id)}>
                <UserAvatar user={p} size="sm" />
                {p.display_name}
              </DropdownMenuItem>
            ))}
            {opportunity.assigned_to && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAssign(opportunity, null)}>
                  Αφαίρεση ανάθεσης
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
