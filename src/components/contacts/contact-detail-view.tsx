"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addNote,
  addTask,
  deleteActivityEntry,
  deleteContact,
  setTaskDone,
  updateActivityContent,
  updateContactWithLog,
} from "@/lib/queries/contacts";
import { createClient } from "@/lib/supabase/client";
import type {
  ActivityEntry,
  Contact,
  ContactOpportunity,
  FollowUpTask,
  Payment,
} from "@/lib/types";
import { AddTaskDialog } from "./add-task-dialog";
import { ActivityFeed } from "./activity-feed";
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
  usingMockData,
}: {
  contact: Contact;
  initialOpportunities: ContactOpportunity[];
  initialActivity: ActivityEntry[];
  initialTasks: FollowUpTask[];
  initialPayments: Payment[];
  usingMockData: boolean;
}) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [activity, setActivity] = useState(initialActivity);
  const [tasks, setTasks] = useState(initialTasks);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteContactOpen, setDeleteContactOpen] = useState(false);

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
      const updated = await updateContactWithLog(supabase, contact.id, values, true);
      setContact(updated);
      setActivity((prev) => [
        {
          id: `local-${crypto.randomUUID()}`,
          opportunity_id: null,
          type: "note",
          content: "Ενημερώθηκαν στοιχεία επικοινωνίας",
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
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success("Η σημείωση προστέθηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      const created = await addNote(supabase, contact.id, content);
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
              href={contact.website}
              target="_blank"
              rel="noreferrer"
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground">Opportunities</h2>
            <div className="mt-2">
              <OpportunitiesList opportunities={initialOpportunities} />
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
