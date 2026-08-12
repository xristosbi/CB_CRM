"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Globe, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { addNote, addTask, setTaskDone } from "@/lib/queries/contacts";
import { createClient } from "@/lib/supabase/client";
import type { ActivityEntry, Contact, ContactOpportunity, FollowUpTask } from "@/lib/types";
import { AddTaskDialog } from "./add-task-dialog";
import { ActivityFeed } from "./activity-feed";
import { NotesPanel } from "./notes-panel";
import { OpportunitiesList } from "./opportunities-list";
import { TasksPanel } from "./tasks-panel";

export function ContactDetailView({
  contact,
  initialOpportunities,
  initialActivity,
  initialTasks,
  usingMockData,
}: {
  contact: Contact;
  initialOpportunities: ContactOpportunity[];
  initialActivity: ActivityEntry[];
  initialTasks: FollowUpTask[];
  usingMockData: boolean;
}) {
  const [activity, setActivity] = useState(initialActivity);
  const [tasks, setTasks] = useState(initialTasks);

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
        <h1 className="text-2xl font-semibold tracking-tight">{contact.name}</h1>
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
              <ActivityFeed activity={activity} />
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-6">
          <NotesPanel activity={activity} onAdd={handleAddNote} />
        </div>
      </div>
    </div>
  );
}
