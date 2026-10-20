"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { describeError } from "@/lib/errors";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import {
  addDaysAthens,
  addMonthsAthens,
  formatAthensDateLong,
  formatAthensMonthYear,
  formatAthensWeekdayLong,
} from "@/lib/calendar-tz";
import {
  buildAppointmentLogContent,
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_COLORS,
  CALENDAR_EVENT_TYPE_LABELS,
} from "@/lib/calendar-event-types";
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
import type { CalendarEvent, CalendarTaskEntry, Contact, OpportunityCard, Pipeline, Stage } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import { toast } from "sonner";

import { AgendaView, AGENDA_WINDOW_DAYS } from "./agenda-view";
import { DayView } from "./day-view";
import { DeleteEventDialog } from "./delete-event-dialog";
import { EventDialog, type OpportunityOption } from "./event-dialog";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";

type ViewMode = "month" | "week" | "day" | "agenda";

export function CalendarView({
  initialEvents,
  initialTasks,
  contacts,
  pipelines,
  stages,
  opportunities,
  usingMockData,
}: {
  initialEvents: CalendarEvent[];
  initialTasks: CalendarTaskEntry[];
  contacts: Contact[];
  pipelines: Pipeline[];
  stages: Stage[];
  opportunities: OpportunityCard[];
  usingMockData: boolean;
}) {
  const router = useRouter();
  const { currentUser, profiles } = useCurrentUser();
  const [events, setEvents] = useState(initialEvents);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "me">(
    currentUser.role === "admin" ? "all" : "me"
  );
  const [dialogState, setDialogState] = useState<
    { mode: "create"; defaultStart: Date } | { mode: "edit"; event: CalendarEvent } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [banner, setBanner] = useState<{ tone: "error" | "warning"; message: string } | null>(null);

  const visibleEvents = useMemo(
    () => (assigneeFilter === "me" ? events.filter((e) => e.assigned_to === currentUser.id) : events),
    [events, assigneeFilter, currentUser.id]
  );

  const opportunityOptions = useMemo<OpportunityOption[]>(() => {
    const pipelineNameById = new Map(pipelines.map((p) => [p.id, p.name]));
    const stageNameById = new Map(stages.map((s) => [s.id, s.name]));
    return opportunities.map((o) => ({
      id: o.id,
      contact_id: o.contact_id,
      label: `${pipelineNameById.get(o.pipeline_id) ?? "—"} — ${stageNameById.get(o.stage_id) ?? "—"}`,
    }));
  }, [opportunities, pipelines, stages]);

  function reportIssue(message: string, tone: "error" | "warning" = "error") {
    setBanner({ tone, message });
    if (tone === "error") toast.error(message, { duration: Infinity });
    else toast.warning(message, { duration: Infinity });
  }

  // Mobile default: agenda. Decided once on mount (not derived during
  // render, since window/matchMedia isn't available during SSR) so a
  // manual switch later is never overridden by a resize.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      // One-time mount default from a browser API SSR can't see, not a data sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode("agenda");
    }
  }, []);

  // Realtime: reflect appointments created/changed elsewhere instantly —
  // in particular, step-2's inbound Make webhook writes via the service-role
  // client, so without this the calendar would only pick it up on refresh.
  useEffect(() => {
    if (usingMockData) return;
    const supabase = createClient();

    const channel = supabase
      .channel("calendar-events-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setEvents((prev) => prev.filter((e) => e.id !== oldId));
            return;
          }

          const row = payload.new as Database["public"]["Tables"]["calendar_events"]["Row"];
          let contact: { name: string; phone: string | null; email: string | null } | null = null;
          if (row.contact_id) {
            const { data } = await supabase
              .from("contacts")
              .select("name, phone, email")
              .eq("id", row.contact_id)
              .maybeSingle();
            contact = data;
          }

          const mapped: CalendarEvent = {
            id: row.id,
            title: row.title,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            type: row.type,
            contact_id: row.contact_id,
            contact_name: contact?.name ?? null,
            contact_phone: contact?.phone ?? null,
            contact_email: contact?.email ?? null,
            opportunity_id: row.opportunity_id,
            notes: row.notes,
            google_event_id: row.google_event_id,
            assigned_to: row.assigned_to,
            assigned_to_name: row.assigned_to
              ? profiles.find((p) => p.id === row.assigned_to)?.display_name ?? null
              : null,
          };

          setEvents((prev) => {
            const exists = prev.some((e) => e.id === mapped.id);
            return exists ? prev.map((e) => (e.id === mapped.id ? mapped : e)) : [...prev, mapped];
          });
          if (payload.eventType === "INSERT") {
            toast.info("Νέο ραντεβού", { description: mapped.title });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usingMockData, profiles]);

  function goToday() {
    setAnchorDate(new Date());
  }

  function goPrev() {
    setAnchorDate((prev) => {
      if (viewMode === "month") return addMonthsAthens(prev, -1);
      if (viewMode === "week") return addDaysAthens(prev, -7);
      if (viewMode === "agenda") return addDaysAthens(prev, -AGENDA_WINDOW_DAYS);
      return addDaysAthens(prev, -1);
    });
  }

  function goNext() {
    setAnchorDate((prev) => {
      if (viewMode === "month") return addMonthsAthens(prev, 1);
      if (viewMode === "week") return addDaysAthens(prev, 7);
      if (viewMode === "agenda") return addDaysAthens(prev, AGENDA_WINDOW_DAYS);
      return addDaysAthens(prev, 1);
    });
  }

  function openCreateDialog(defaultStart: Date) {
    setDialogState({ mode: "create", defaultStart });
  }

  function openEditDialog(event: CalendarEvent) {
    setDialogState({ mode: "edit", event });
  }

  function handleTaskClick(task: CalendarTaskEntry) {
    router.push(`/contacts/${task.contact_id}`);
  }

  async function handleSaveEvent(values: CalendarEventInput) {
    const isEdit = dialogState?.mode === "edit";
    const editingId = isEdit ? dialogState.event.id : null;

    if (usingMockData) {
      const contact = values.contact_id ? contacts.find((c) => c.id === values.contact_id) : null;
      const assigneeName = values.assigned_to
        ? profiles.find((p) => p.id === values.assigned_to)?.display_name ?? null
        : null;
      if (editingId) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  ...values,
                  contact_name: contact?.name ?? null,
                  contact_phone: contact?.phone ?? null,
                  contact_email: contact?.email ?? null,
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
            contact_name: contact?.name ?? null,
            contact_phone: contact?.phone ?? null,
            contact_email: contact?.email ?? null,
            assigned_to_name: assigneeName,
            google_event_id: null,
          },
        ]);
      }
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

      if (values.contact_id) {
        try {
          await insertActivity(supabase, {
            contact_id: values.contact_id,
            opportunity_id: values.opportunity_id,
            type: "note",
            content: buildAppointmentLogContent(values.type, values.starts_at),
            user_id: currentUser.id,
          });
        } catch (err) {
          reportIssue(
            `Το ραντεβού αποθηκεύτηκε, αλλά δεν καταγράφηκε στο ιστορικό δραστηριότητας. ${describeError(err)}`,
            "warning"
          );
        }
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

  const headerLabel =
    viewMode === "month"
      ? formatAthensMonthYear(anchorDate)
      : viewMode === "week"
        ? formatAthensMonthYear(anchorDate)
        : viewMode === "day"
          ? `${formatAthensWeekdayLong(anchorDate)}, ${formatAthensDateLong(anchorDate)}`
          : `${formatAthensDateLong(anchorDate)} — επόμενες ${AGENDA_WINDOW_DAYS} μέρες`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev} aria-label="Προηγούμενο">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Σήμερα
            </Button>
            <Button variant="outline" size="icon" onClick={goNext} aria-label="Επόμενο">
              <ChevronRight className="size-4" />
            </Button>
            <span className="ml-1 text-sm font-medium sm:text-base">{headerLabel}</span>
          </div>
          <Button size="sm" onClick={() => openCreateDialog(new Date())}>
            <Plus className="size-4" />
            Νέο ραντεβού
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">Μήνας</TabsTrigger>
              <TabsTrigger value="week">Εβδομάδα</TabsTrigger>
              <TabsTrigger value="day">Ημέρα</TabsTrigger>
              <TabsTrigger value="agenda">Ατζέντα</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v as "all" | "me")}>
              <SelectTrigger size="sm" className="w-auto gap-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλοι</SelectItem>
                <SelectItem value="me">Εγώ</SelectItem>
              </SelectContent>
            </Select>
            {CALENDAR_EVENT_TYPES.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-2 rounded-full", CALENDAR_EVENT_TYPE_COLORS[t].dot)} />
                {CALENDAR_EVENT_TYPE_LABELS[t]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {banner && (
        <div
          role="alert"
          className={cn(
            "flex items-start justify-between gap-3 border-b px-4 py-2.5 text-sm font-medium",
            banner.tone === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/15 text-warning-foreground"
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

      {usingMockData && (
        <div className="border-b bg-warning/10 px-4 py-2 text-xs text-warning-foreground">
          Demo δεδομένα (χωρίς Supabase σύνδεση) — πρόσθεσε NEXT_PUBLIC_SUPABASE_URL /
          NEXT_PUBLIC_SUPABASE_ANON_KEY στο .env.local για πραγματικά δεδομένα.
        </div>
      )}

      <div className="min-h-0 flex-1">
        {viewMode === "month" && (
          <MonthView
            anchorDate={anchorDate}
            events={visibleEvents}
            tasks={initialTasks}
            onSlotClick={openCreateDialog}
            onEventClick={openEditDialog}
            onTaskClick={handleTaskClick}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            anchorDate={anchorDate}
            events={visibleEvents}
            tasks={initialTasks}
            onSlotClick={openCreateDialog}
            onEventClick={openEditDialog}
            onTaskClick={handleTaskClick}
          />
        )}
        {viewMode === "day" && (
          <DayView
            anchorDate={anchorDate}
            events={visibleEvents}
            tasks={initialTasks}
            onSlotClick={openCreateDialog}
            onEventClick={openEditDialog}
            onTaskClick={handleTaskClick}
          />
        )}
        {viewMode === "agenda" && (
          <AgendaView
            anchorDate={anchorDate}
            events={visibleEvents}
            tasks={initialTasks}
            onEventClick={openEditDialog}
          />
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
        contacts={contacts}
        opportunities={opportunityOptions}
        allEvents={events}
        onSave={handleSaveEvent}
        onRequestDelete={(event) => setDeleteTarget(event)}
      />

      <DeleteEventDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
