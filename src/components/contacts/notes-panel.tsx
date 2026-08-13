"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityEntry } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function NotesPanel({
  activity,
  onAdd,
  onEdit,
  onDelete,
}: {
  activity: ActivityEntry[];
  onAdd: (content: string) => Promise<void> | void;
  onEdit: (id: string, content: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const notes = activity.filter((entry) => entry.type === "note");

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(content.trim());
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold text-muted-foreground">Σημειώσεις</h2>

      <div className="flex flex-col gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Γράψε μια σημείωση..."
          rows={3}
        />
        <Button
          type="button"
          size="sm"
          className="self-end"
          disabled={submitting || !content.trim()}
          onClick={handleSubmit}
        >
          {submitting ? "Προσθήκη..." : "Προσθήκη"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-t pt-3">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground">Δεν υπάρχουν σημειώσεις ακόμα.</p>
        )}
        {notes.map((note) => (
          <NoteRow key={note.id} note={note} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function NoteRow({
  note,
  onEdit,
  onDelete,
}: {
  note: ActivityEntry;
  onEdit: (id: string, content: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"view" | "editing" | "confirmingDelete">("view");
  const [draft, setDraft] = useState(note.content ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSaveEdit() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await onEdit(note.id, draft.trim());
      setMode("view");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete() {
    setBusy(true);
    try {
      await onDelete(note.id);
    } finally {
      setBusy(false);
    }
  }

  if (mode === "editing") {
    return (
      <div className="text-sm">
        <Textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={handleSaveEdit}>
            Αποθήκευση
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode("view")}>
            Άκυρο
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group text-sm">
      <p className="whitespace-pre-wrap">{note.content}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {dateFormatter.format(new Date(note.created_at))}
        </p>
        {mode === "confirmingDelete" ? (
          <div className="flex items-center gap-1">
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
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Επεξεργασία σημείωσης"
              onClick={() => {
                setDraft(note.content ?? "");
                setMode("editing");
              }}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Διαγραφή σημείωσης"
              onClick={() => setMode("confirmingDelete")}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
