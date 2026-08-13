"use client";

import { useState } from "react";
import { Bot, Check, Pencil, Phone, StickyNote, ArrowRightLeft, Euro, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityEntry } from "@/lib/types";
import type { ActivityType } from "@/lib/database.types";

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

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ActivityFeed({
  activity,
  onEdit,
  onDelete,
}: {
  activity: ActivityEntry[];
  onEdit: (id: string, content: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  if (activity.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Δεν υπάρχει ακόμα δραστηριότητα.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {activity.map((entry) => (
        <ActivityFeedItem key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ol>
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
                <span className="text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(entry.created_at))}
                </span>
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
