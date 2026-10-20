"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DeleteEventDialog } from "@/components/calendar/delete-event-dialog";
import { EventDialog, type OpportunityOption } from "@/components/calendar/event-dialog";
import { EventRow } from "@/components/calendar/event-pieces";
import { buildAppointmentLogContent } from "@/lib/calendar-event-types";
import { describeError } from "@/lib/errors";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { notifyCalendarWebhook } from "@/lib/calendar-webhook-client";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  type CalendarEventInput,
} from "@/lib/queries/calendar";
import { insertActivity } from "@/lib/queries/leads";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ActivityEntry, CalendarEvent, Contact, ContactOpportunity } from "@/lib/types";

export function AppointmentsSection({
  contact,
  opportunities,
  initialEvents,
  usingMockData,
  onActivityLogged,
}: {
  contact: Contact;
  opportunities: ContactOpportunity[];
  initialEvents: CalendarEvent[];
  usingMockData: boolean;
  onActivityLogged: (entry: ActivityEntry) => void;
}) {
  const { currentUser, profiles } = useCurrentUser();
  const [events, setEvents] = useState(initialEvents);
  const [dialogState, setDialogState] = useState<
    { mode: "create"; defaultStart: Date } | { mode: "edit"; event: CalendarEvent } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [banner, setBanner] = useState<{ tone: "error" | "warning"; message: string } | null>(null);

  function reportIssue(message: string, tone: "error" | "warning" = "error") {
    setBanner({ tone, message });
    if (tone === "error") toast.error(message, { duration: Infinity });
    else toast.warning(message, { duration: Infinity });
  }

  const opportunityOptions = useMemo<OpportunityOption[]>(
    () =>
      opportunities.map((o) => ({
        id: o.id,
        contact_id: contact.id,
        label: `${o.pipeline_name} — ${o.stage_name}`,
      })),
    [opportunities, contact.id]
  );

  const { upcoming, past } = useMemo(() => {
    const now = new Date().getTime();
    const sorted = [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return {
      upcoming: sorted.filter((e) => new Date(e.starts_at).getTime() >= now),
      past: sorted.filter((e) => new Date(e.starts_at).getTime() < now).reverse(),
    };
  }, [events]);

  async function handleSave(values: CalendarEventInput) {
    const isEdit = dialogState?.mode === "edit";
    const editingId = isEdit ? dialogState.event.id : null;

    const assigneeName = values.assigned_to
      ? profiles.find((p) => p.id === values.assigned_to)?.display_name ?? null
      : null;

    if (usingMockData) {
      if (editingId) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  ...values,
                  contact_name: contact.name,
                  contact_phone: contact.phone,
                  contact_email: contact.email,
                  assigned_to_name: assigneeName,
                }
              : e
          )
        );
      } else {
        setEvents((prev) => [
          ...prev,
          {
            id: `mock-${crypto.randomUUID()}`,
            ...values,
            contact_name: contact.name,
            contact_phone: contact.phone,
            contact_email: contact.email,
            assigned_to_name: assigneeName,
            google_event_id: null,
          },
        ]);
      }
      onActivityLogged({
        id: `local-${crypto.randomUUID()}`,
        opportunity_id: values.opportunity_id,
        type: "note",
        content: buildAppointmentLogContent(values.type, values.starts_at),
        user_id: currentUser.id,
        user_name: currentUser.display_name,
        created_at: new Date().toISOString(),
      });
      toast.success(
        editingId ? "Το ραντεβού ενημερώθηκε (demo δεδομένα)." : "Το ραντεβού δημιουργήθηκε (demo δεδομένα)."
      );
      return;
    }

    try {
      const supabase = createClient();
      const saved = editingId
        ? await updateCalendarEvent(supabase, editingId, values)
        : await createCalendarEvent(supabase, values);

      setEvents((prev) =>
        editingId ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved]
      );

      try {
        await insertActivity(supabase, {
          contact_id: contact.id,
          opportunity_id: values.opportunity_id,
          type: "note",
          content: buildAppointmentLogContent(values.type, values.starts_at),
          user_id: currentUser.id,
        });
        onActivityLogged({
          id: `local-${crypto.randomUUID()}`,
          opportunity_id: values.opportunity_id,
          type: "note",
          content: buildAppointmentLogContent(values.type, values.starts_at),
          user_id: currentUser.id,
          user_name: currentUser.display_name,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        reportIssue(
          `Το ραντεβού αποθηκεύτηκε, αλλά δεν καταγράφηκε στο ιστορικό δραστηριότητας. ${describeError(err)}`,
          "warning"
        );
      }

      notifyCalendarWebhook({
        action: editingId ? "updated" : "created",
        id: saved.id,
        title: saved.title,
        type: saved.type,
        starts_at: saved.starts_at,
        ends_at: saved.ends_at,
        notes: saved.notes,
        contact_name: saved.contact_name,
        contact_phone: saved.contact_phone,
        contact_email: saved.contact_email,
        google_event_id: saved.google_event_id,
      });

      toast.success(editingId ? "Το ραντεβού ενημερώθηκε." : "Το ραντεβού δημιουργήθηκε.");
    } catch (err) {
      reportIssue(`Η αποθήκευση του ραντεβού απέτυχε. ${describeError(err)}`);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;

    if (usingMockData) {
      setEvents((prev) => prev.filter((e) => e.id !== target.id));
      setDeleteTarget(null);
      toast.success("Το ραντεβού διαγράφηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      await deleteCalendarEvent(supabase, target.id);
      setEvents((prev) => prev.filter((e) => e.id !== target.id));
      notifyCalendarWebhook({
        action: "deleted",
        id: target.id,
        title: target.title,
        type: target.type,
        starts_at: target.starts_at,
        ends_at: target.ends_at,
        notes: target.notes,
        contact_name: target.contact_name,
        contact_phone: target.contact_phone,
        contact_email: target.contact_email,
        google_event_id: target.google_event_id,
      });
      toast.success("Το ραντεβού διαγράφηκε.");
    } catch (err) {
      reportIssue(`Η διαγραφή απέτυχε. ${describeError(err)}`);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Ραντεβού</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogState({ mode: "create", defaultStart: new Date() })}
        >
          <Plus className="size-4" />
          Νέο ραντεβού
        </Button>
      </div>

      {banner && (
        <div
          role="alert"
          className={cn(
            "mt-2 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm font-medium",
            banner.tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-warning/30 bg-warning/15 text-warning-foreground"
          )}
        >
          <p className="flex-1">{banner.message}</p>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Κλείσιμο μηνύματος"
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-col gap-4">
        {upcoming.length === 0 && past.length === 0 && (
          <p className="text-sm text-muted-foreground">Κανένα ραντεβού ακόμα.</p>
        )}

        {upcoming.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Επερχόμενα</p>
            {upcoming.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onEdit={() => setDialogState({ mode: "edit", event })}
              />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="flex flex-col gap-1.5 opacity-70">
            <p className="text-xs font-medium text-muted-foreground">Παλιά</p>
            {past.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onEdit={() => setDialogState({ mode: "edit", event })}
              />
            ))}
          </div>
        )}
      </div>

      <EventDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        mode={dialogState?.mode ?? "create"}
        event={dialogState?.mode === "edit" ? dialogState.event : null}
        defaultStart={dialogState?.mode === "create" ? dialogState.defaultStart : null}
        contacts={[contact]}
        opportunities={opportunityOptions}
        allEvents={events}
        lockedContactId={contact.id}
        onSave={handleSave}
        onRequestDelete={(event) => setDeleteTarget(event)}
      />

      <DeleteEventDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
