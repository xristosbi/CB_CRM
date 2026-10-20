"use client";

import { useState } from "react";
import { Bot, Check, Pencil, Phone, StickyNote, ArrowRightLeft, Euro, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/users/user-avatar";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/types";
import type { ActivityType } from "@/lib/database.types";

const CONTACT_TYPES: ActivityType[] = ["call", "note"];

const ICONS: Record<ActivityType, typeof Phone> = {
  call: Phone,
  note: StickyNote,
  stage_change: ArrowRightLeft,
  fathom_summary: Bot,
  payment: Euro,
};

const LABELS: Record<ActivityType, string> = {
  call: "Κλήση",
  note: "Σημείωση",
  stage_change: "Αλλαγή σταδίου",
  fathom_summary: "Fathom summary",
  payment: "Πληρωμή",
};

const EDITABLE_TYPES: ActivityType[] = ["note", "call"];

export function ActivityFeed({
  activity,
  onEdit,
  onDelete,
}: {
  activity: ActivityEntry[];
  onEdit: (id: string, content: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<"all" | "contacts">("all");
  const filtered = filter === "contacts" ? activity.filter((a) => CONTACT_TYPES.includes(a.type)) : activity;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {(
          [
            ["all", "Όλα"],
            ["contacts", "Μόνο επαφές"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              filter === value ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Δεν υπάρχει ακόμα δραστηριότητα.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {filtered.map((entry) => (
            <ActivityFeedItem key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityFeedItem({
  entry,
  onEdit,
  onDelete,
}: {
  entry: ActivityEntry;
  onEdit: (id: string, content: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"view" | "editing" | "confirmingDelete">("view");
  const [draft, setDraft] = useState(entry.content ?? "");
  const [busy, setBusy] = useState(false);

  const Icon = ICONS[entry.type];
  const editable = EDITABLE_TYPES.includes(entry.type);

  async function handleSaveEdit() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await onEdit(entry.id, draft.trim());
      setMode("view");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete() {
    setBusy(true);
    try {
      await onDelete(entry.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{LABELS[entry.type]}</span>
          <div className="flex shrink-0 items-center gap-1">
            {mode === "view" && (
              <>
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Επεξεργασία"
                    onClick={() => {
                      setDraft(entry.content ?? "");
                      setMode("editing");
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Διαγραφή"
                  onClick={() => setMode("confirmingDelete")}
                >
                  <Trash2 className="size-3" />
                </Button>
              </>
            )}
            {mode === "confirmingDelete" && (
              <>
                <span className="text-xs text-muted-foreground">Διαγραφή;</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-destructive"
                  aria-label="Επιβεβαίωση διαγραφής"
                  disabled={busy}
                  onClick={handleConfirmDelete}
                >
                  <Check className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Ακύρωση"
                  onClick={() => setMode("view")}
                >
                  <X className="size-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserAvatar
            user={entry.user_id ? { id: entry.user_id, display_name: entry.user_name, color: null } : null}
            size="sm"
          />
          <span>
            {entry.user_name ?? "Σύστημα"} · {formatRelativeTime(entry.created_at)}
          </span>
        </div>

        {mode === "editing" ? (
          <div className="mt-1.5 flex flex-col gap-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={handleSaveEdit}>
                Αποθήκευση
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setMode("view")}>
                Άκυρο
              </Button>
            </div>
          </div>
        ) : (
          entry.content && (
            <p className="mt-0.5 text-sm whitespace-pre-wrap text-muted-foreground">
              {entry.content}
            </p>
          )
        )}
      </div>
    </li>
  );
}
