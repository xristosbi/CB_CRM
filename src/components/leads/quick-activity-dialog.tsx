"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityType } from "@/lib/database.types";
import type { OpportunityCard } from "@/lib/types";

export function QuickActivityDialog({
  target,
  type,
  onOpenChange,
  onSubmit,
}: {
  target: OpportunityCard | null;
  type: Extract<ActivityType, "call" | "note"> | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (content: string) => Promise<void> | void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const open = Boolean(target && type);
  const title = type === "call" ? "Καταγραφή κλήσης" : "Νέα σημείωση";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(content);
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setContent("");
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{target?.contact_name}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === "call" ? "Τι ειπώθηκε στην κλήση..." : "Σημείωση..."}
              rows={4}
            />
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
