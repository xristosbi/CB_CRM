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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Pipeline } from "@/lib/types";

export function RenamePipelineDialog({
  target,
  onOpenChange,
  onSave,
}: {
  target: Pipeline | null;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void> | void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        {target && (
          <RenamePipelineForm target={target} onSave={onSave} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RenamePipelineForm({
  target,
  onSave,
  onClose,
}: {
  target: Pipeline;
  onSave: (name: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [name, setName] = useState(target.name);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === target.name) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Μετονομασία pipeline</DialogTitle>
        <DialogDescription>{target.name}</DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="pipeline-rename">Όνομα pipeline</Label>
        <Input id="pipeline-rename" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>

      <DialogFooter className="mt-6">
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </DialogFooter>
    </form>
  );
}
