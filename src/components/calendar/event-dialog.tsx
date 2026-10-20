"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContactPicker } from "./contact-picker";
import { CALENDAR_EVENT_TYPES, CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar-event-types";
import {
  formatAthensTime,
  parseDateTimeInputsToDate,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/calendar-tz";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import type { CalendarEventInput } from "@/lib/queries/calendar";
import type { CalendarEvent, Contact } from "@/lib/types";
import type { CalendarEventType } from "@/lib/database.types";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// A pre-labeled opportunity option — callers build the label themselves
// (e.g. "Chatbot — Επικοινωνία" from pipeline+stage names, or anything
// else), so this dialog doesn't need to know about pipelines/stages at all.
export interface OpportunityOption {
  id: string;
  contact_id: string;
  label: string;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function EventDialog({
  open,
  onOpenChange,
  mode,
  event,
  defaultStart,
  contacts,
  opportunities,
  allEvents,
  lockedContactId,
  onSave,
  onRequestDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  event?: CalendarEvent | null;
  defaultStart?: Date | null;
  contacts: Contact[];
  opportunities: OpportunityOption[];
  allEvents: CalendarEvent[];
  // Set from the contact detail page: the appointment is always for this
  // one contact, so the picker is replaced with a static label instead of
  // offering to pick a different contact.
  lockedContactId?: string;
  onSave: (values: CalendarEventInput) => Promise<void>;
  onRequestDelete?: (event: CalendarEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {open && (
          <EventForm
            mode={mode}
            event={event ?? null}
            defaultStart={defaultStart ?? null}
            contacts={contacts}
            opportunities={opportunities}
            allEvents={allEvents}
            lockedContactId={lockedContactId}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
            onRequestDelete={onRequestDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  mode,
  event,
  defaultStart,
  contacts,
  opportunities,
  allEvents,
  lockedContactId,
  onSave,
  onClose,
  onRequestDelete,
}: {
  mode: "create" | "edit";
  event: CalendarEvent | null;
  defaultStart: Date | null;
  contacts: Contact[];
  opportunities: OpportunityOption[];
  allEvents: CalendarEvent[];
  lockedContactId?: string;
  onSave: (values: CalendarEventInput) => Promise<void>;
  onClose: () => void;
  onRequestDelete?: (event: CalendarEvent) => void;
}) {
  const initialStart = event ? new Date(event.starts_at) : (defaultStart ?? new Date());
  const initialDurationMinutes = event
    ? Math.max(5, Math.round((new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000))
    : 30;

  const { currentUser, profiles } = useCurrentUser();

  const [title, setTitle] = useState(event?.title ?? "");
  const [type, setType] = useState<CalendarEventType>(event?.type ?? "sales_call");
  const [dateStr, setDateStr] = useState(toDateInputValue(initialStart));
  const [timeStr, setTimeStr] = useState(toTimeInputValue(initialStart));
  const [duration, setDuration] = useState(initialDurationMinutes);
  const [contactId, setContactId] = useState<string | null>(
    lockedContactId ?? event?.contact_id ?? null
  );
  const [opportunityId, setOpportunityId] = useState<string | null>(event?.opportunity_id ?? null);
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [assignedTo, setAssignedTo] = useState<string | null>(
    mode === "edit" ? event?.assigned_to ?? null : currentUser.id
  );
  const [submitting, setSubmitting] = useState(false);

  const lockedContactName = lockedContactId
    ? (contacts.find((c) => c.id === lockedContactId)?.name ?? event?.contact_name ?? "—")
    : null;

  const contactOpportunities = useMemo(
    () => (contactId ? opportunities.filter((o) => o.contact_id === contactId) : []),
    [opportunities, contactId]
  );

  const { startsAt, endsAt } = useMemo(() => {
    if (!dateStr || !timeStr) return { startsAt: null, endsAt: null };
    const start = parseDateTimeInputsToDate(dateStr, timeStr);
    const end = new Date(start.getTime() + duration * 60000);
    return { startsAt: start, endsAt: end };
  }, [dateStr, timeStr, duration]);

  const conflicts = useMemo(() => {
    if (!startsAt || !endsAt) return [];
    const startIso = startsAt.toISOString();
    const endIso = endsAt.toISOString();
    return allEvents.filter(
      (e) => e.id !== event?.id && overlaps(e.starts_at, e.ends_at, startIso, endIso)
    );
  }, [allEvents, startsAt, endsAt, event?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt || !endsAt) return;

    setSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        type,
        contact_id: contactId,
        opportunity_id: opportunityId,
        notes: notes.trim() || null,
        assigned_to: assignedTo,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Νέο ραντεβού" : "Επεξεργασία ραντεβού"}</DialogTitle>
        <DialogDescription>
          {mode === "create"
            ? "Προσθήκη νέου ραντεβού στο ημερολόγιο."
            : "Ενημέρωσε τα στοιχεία του ραντεβού."}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-title">Τίτλος</Label>
          <Input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Τύπος</Label>
          <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALENDAR_EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {CALENDAR_EVENT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-date">Ημερομηνία</Label>
            <Input
              id="event-date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-time">Ώρα έναρξης</Label>
            <Input
              id="event-time"
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Διάρκεια</Label>
          <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} λεπτά
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {endsAt && startsAt && (
            <p className="text-xs text-muted-foreground">
              {formatAthensTime(startsAt)} – {formatAthensTime(endsAt)}
            </p>
          )}
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/15 px-3 py-2 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <div>
              <p className="font-medium">Επικαλύπτεται με:</p>
              <ul className="mt-0.5 list-disc pl-4">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    {c.title} ({formatAthensTime(new Date(c.starts_at))}–
                    {formatAthensTime(new Date(c.ends_at))})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Επαφή</Label>
          {lockedContactId ? (
            <Input value={lockedContactName ?? ""} disabled />
          ) : (
            <ContactPicker
              contacts={contacts}
              value={contactId}
              onChange={(id) => {
                setContactId(id);
                setOpportunityId(null);
              }}
            />
          )}
        </div>

        {contactId && contactOpportunities.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label>Opportunity (προαιρετικό)</Label>
            <Select
              value={opportunityId ?? "none"}
              onValueChange={(v) => setOpportunityId(v === "none" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Κανένα</SelectItem>
                {contactOpportunities.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Υπεύθυνος</Label>
          <Select
            value={assignedTo ?? "unassigned"}
            onValueChange={(v) => setAssignedTo(v === "unassigned" ? null : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Μη ανατεθειμένο</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-notes">Σημειώσεις</Label>
          <Textarea
            id="event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter className="mt-6 flex-row items-center justify-between sm:justify-between">
        {mode === "edit" && event && onRequestDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              onClose();
              onRequestDelete(event);
            }}
          >
            Διαγραφή
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? "Αποθήκευση..." : mode === "create" ? "Δημιουργία" : "Αποθήκευση"}
        </Button>
      </DialogFooter>
    </form>
  );
}
