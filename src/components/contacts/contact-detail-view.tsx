"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserLabel } from "@/components/users/user-label";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import {
  addNote,
  addTask,
  deleteActivityEntry,
  deleteContact,
  setTaskDone,
  updateActivityContent,
  updateContactWithLog,
} from "@/lib/queries/contacts";
import { updateOpportunityAssignment } from "@/lib/queries/leads";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/relative-time";
import { describeError } from "@/lib/errors";
import { toHref } from "@/lib/utils";
import type {
  ActivityEntry,
  CalendarEvent,
  Contact,
  ContactOpportunity,
  FollowUpTask,
  Payment,
} from "@/lib/types";
import { AddTaskDialog } from "./add-task-dialog";
import { ActivityFeed } from "./activity-feed";
import { AppointmentsSection } from "./appointments-section";
import { ContactDialog, type ContactFormValues } from "./contact-dialog";
import { ContactPaymentsSection } from "./contact-payments-section";
import { DeleteContactDialog } from "./delete-contact-dialog";
import { NotesPanel } from "./notes-panel";
import { OpportunitiesList } from "./opportunities-list";
import { TasksPanel } from "./tasks-panel";

function contactChanged(previous: Contact, values: ContactFormValues) {
  return (
    previous.name !== values.name ||
    (previous.phone ?? "") !== (values.phone ?? "") ||
    (previous.email ?? "") !== (values.email ?? "") ||
    (previous.website ?? "") !== (values.website ?? "") ||
    (previous.source ?? "") !== (values.source ?? "") ||
    [...previous.tags].sort().join(",") !== [...values.tags].sort().join(",")
  );
}

export function ContactDetailView({
  contact: initialContact,
  initialOpportunities,
  initialActivity,
  initialTasks,
  initialPayments,
  initialAppointments,
  usingMockData,
}: {
  contact: Contact;
  initialOpportunities: ContactOpportunity[];
  initialActivity: ActivityEntry[];
  initialTasks: FollowUpTask[];
  initialPayments: Payment[];
  initialAppointments: CalendarEvent[];
  usingMockData: boolean;
}) {
  const router = useRouter();
  const { currentUser, profiles } = useCurrentUser();
  const [contact, setContact] = useState(initialContact);
  const [activity, setActivity] = useState(initialActivity);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [tasks, setTasks] = useState(initialTasks);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteContactOpen, setDeleteContactOpen] = useState(false);
  const [assignBanner, setAssignBanner] = useState<string | null>(null);

  const lastContact = [...activity]
    .filter((a) => (a.type === "call" || a.type === "note") && a.user_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const contactsByUser = new Map<string, number>();
  for (const a of activity) {
    if ((a.type !== "call" && a.type !== "note") || !a.user_id) continue;
    contactsByUser.set(a.user_id, (contactsByUser.get(a.user_id) ?? 0) + 1);
  }
  const contactsByUserList = Array.from(contactsByUser.entries()).map(([userId, count]) => ({
    name: profiles.find((p) => p.id === userId)?.display_name ?? "—",
    count,
  }));

  async function handleAssignOpportunity(opportunityId: string, userId: string | null) {
    const previous = opportunities.find((o) => o.id === opportunityId);
    const nextName = userId ? profiles.find((p) => p.id === userId)?.display_name ?? null : null;
    setOpportunities((prev) =>
      prev.map((o) => (o.id === opportunityId ? { ...o, assigned_to: userId, assigned_to_name: nextName } : o))
    );

    if (usingMockData) return;

    try {
      const supabase = createClient();
      await updateOpportunityAssignment(supabase, opportunityId, userId);
    } catch (err) {
      if (previous) {
        setOpportunities((prev) => prev.map((o) => (o.id === opportunityId ? previous : o)));
      }
      setAssignBanner(`Η ανάθεση απέτυχε. ${describeError(err)}`);
    }
  }

  async function handleUpdateContact(values: ContactFormValues) {
    const changed = contactChanged(contact, values);
    if (!changed) return;

    if (usingMockData) {
      setContact((prev) => ({ ...prev, ...values }));
      toast.success("Τα στοιχεία ενημερώθηκαν (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      const updated = await updateContactWithLog(supabase, contact.id, values, true, currentUser.id);
      setContact(updated);
      setActivity((prev) => [
        {
          id: `local-${crypto.randomUUID()}`,
          opportunity_id: null,
          type: "note",
          content: "Ενημερώθηκαν στοιχεία επικοινωνίας",
          user_id: currentUser.id,
          user_name: currentUser.display_name,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success("Τα στοιχεία ενημερώθηκαν.");
    } catch {
      toast.error("Η ενημέρωση απέτυχε.");
    }
  }

  async function handleAddNote(content: string) {
    if (usingMockData) {
      setActivity((prev) => [
        {
          id: `mock-${crypto.randomUUID()}`,
          opportunity_id: null,
          type: "note",
          content,
          user_id: currentUser.id,
          user_name: currentUser.display_name,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success("Η σημείωση προστέθηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      const created = await addNote(supabase, contact.id, content, currentUser.id);
      setActivity((prev) => [created, ...prev]);
      toast.success("Η σημείωση αποθηκεύτηκε.");
    } catch {
      toast.error("Η αποθήκευση απέτυχε.");
    }
  }

  async function handleAddTask(title: string, dueAt: string | null) {
    if (usingMockData) {
      setTasks((prev) => [
        {
          id: `mock-${crypto.randomUUID()}`,
          title,
          due_at: dueAt,
          done: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success("Το task προστέθηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      const created = await addTask(supabase, contact.id, title, dueAt);
      setTasks((prev) => [created, ...prev]);
      toast.success("Το task αποθηκεύτηκε.");
    } catch {
      toast.error("Η αποθήκευση απέτυχε.");
    }
  }

  async function handleToggleTask(taskId: string, done: boolean) {
    const previous = tasks.find((t) => t.id === taskId)?.done ?? false;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));

    if (usingMockData) return;

    try {
      const supabase = createClient();
      await setTaskDone(supabase, taskId, done);
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: previous } : t)));
      toast.error("Η ενημέρωση απέτυχε.");
    }
  }

  function handleAppointmentActivityLogged(entry: ActivityEntry) {
    setActivity((prev) => [entry, ...prev]);
  }

  async function handleEditActivityEntry(id: string, content: string) {
    const previous = activity.find((a) => a.id === id)?.content ?? null;
    setActivity((prev) => prev.map((a) => (a.id === id ? { ...a, content } : a)));

    if (usingMockData) {
      toast.success("Ενημερώθηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      await updateActivityContent(supabase, id, content);
      toast.success("Ενημερώθηκε.");
    } catch {
      setActivity((prev) => prev.map((a) => (a.id === id ? { ...a, content: previous } : a)));
      toast.error("Η ενημέρωση απέτυχε.");
    }
  }

  async function handleDeleteActivityEntry(id: string) {
    const previous = activity;
    setActivity((prev) => prev.filter((a) => a.id !== id));

    if (usingMockData) {
      toast.success("Διαγράφηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      await deleteActivityEntry(supabase, id);
      toast.success("Διαγράφηκε.");
    } catch {
      setActivity(previous);
      toast.error("Η διαγραφή απέτυχε.");
    }
  }

  async function handleDeleteContact() {
    if (usingMockData) {
      toast.success("Ο πελάτης διαγράφηκε (demo δεδομένα).");
      router.push("/contacts");
      return;
    }

    try {
      const supabase = createClient();
      await deleteContact(supabase, contact.id);
      toast.success("Ο πελάτης διαγράφηκε.");
      router.push("/contacts");
    } catch {
      toast.error("Η διαγραφή απέτυχε.");
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div>
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Πελάτες
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{contact.name}</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Επεξεργασία στοιχείων επαφής"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            aria-label="Διαγραφή πελάτη"
            onClick={() => setDeleteContactOpen(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {contact.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {contact.phone}
            </span>
          )}
          {contact.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" />
              {contact.email}
            </span>
          )}
          {contact.website && (
            <a
              href={toHref(contact.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
            >
              <Globe className="size-3.5" />
              {contact.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
        {contact.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {(lastContact || contactsByUserList.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {lastContact && (
              <span className="inline-flex items-center gap-1.5">
                Τελευταία επαφή:
                <UserLabel
                  user={profiles.find((p) => p.id === lastContact.user_id) ?? null}
                  size="sm"
                  className="text-foreground"
                />
                · {formatRelativeTime(lastContact.created_at)}
              </span>
            )}
            {contactsByUserList.length > 0 && (
              <span>
                Επαφές ανά χρήστη:{" "}
                {contactsByUserList.map((c, i) => (
                  <span key={c.name}>
                    {i > 0 && ", "}
                    {c.name} {c.count}
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      {assignBanner && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          <p className="flex-1">{assignBanner}</p>
          <button
            type="button"
            onClick={() => setAssignBanner(null)}
            aria-label="Κλείσιμο μηνύματος"
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground">Opportunities</h2>
            <div className="mt-2">
              <OpportunitiesList
                opportunities={opportunities}
                profiles={profiles}
                onAssign={handleAssignOpportunity}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Follow-up tasks</h2>
              <AddTaskDialog onCreate={handleAddTask} />
            </div>
            <div className="mt-2">
              <TasksPanel tasks={tasks} onToggle={handleToggleTask} />
            </div>
          </section>

          <AppointmentsSection
            contact={contact}
            opportunities={opportunities}
            initialEvents={initialAppointments}
            usingMockData={usingMockData}
            onActivityLogged={handleAppointmentActivityLogged}
          />

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground">Activity</h2>
            <div className="mt-3">
              <ActivityFeed
                activity={activity}
                onEdit={handleEditActivityEntry}
                onDelete={handleDeleteActivityEntry}
              />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <NotesPanel
            activity={activity}
            onAdd={handleAddNote}
            onEdit={handleEditActivityEntry}
            onDelete={handleDeleteActivityEntry}
          />
          <ContactPaymentsSection
            contactId={contact.id}
            contactName={contact.name}
            initialPayments={initialPayments}
            usingMockData={usingMockData}
          />
        </div>
      </div>

      <ContactDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        contact={contact}
        onSubmit={handleUpdateContact}
      />

      <DeleteContactDialog
        open={deleteContactOpen}
        contactName={contact.name}
        onOpenChange={setDeleteContactOpen}
        onConfirm={handleDeleteContact}
      />
    </div>
  );
}
