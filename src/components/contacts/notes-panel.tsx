"use client";

import { useState } from "react";

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
}: {
  activity: ActivityEntry[];
  onAdd: (content: string) => Promise<void> | void;
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
          <div key={note.id} className="text-sm">
            <p className="whitespace-pre-wrap">{note.content}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dateFormatter.format(new Date(note.created_at))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
