"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAthensDateLong, formatAthensTime } from "@/lib/calendar-tz";
import type { CalendarEvent } from "@/lib/types";

export function DeleteEventDialog({
  target,
  onOpenChange,
  onConfirm,
}: {
  target: CalendarEvent | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Διαγραφή ραντεβού</DialogTitle>
          <DialogDescription>
            {target && (
              <>
                Θα διαγραφεί το &quot;{target.title}&quot; στις{" "}
                {formatAthensDateLong(new Date(target.starts_at))}{" "}
                {formatAthensTime(new Date(target.starts_at))}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Διαγραφή..." : "Διαγραφή ραντεβού"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
