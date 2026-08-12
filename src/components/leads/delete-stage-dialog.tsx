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
import type { Stage } from "@/lib/types";

export function DeleteStageDialog({
  target,
  opportunityCount,
  neighborName,
  onOpenChange,
  onConfirm,
}: {
  target: Stage | null;
  opportunityCount: number;
  neighborName: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const open = Boolean(target);
  const canDelete = neighborName !== null || opportunityCount === 0;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Διαγραφή σταδίου &quot;{target?.name}&quot;</DialogTitle>
          <DialogDescription>
            {!canDelete
              ? "Αυτό είναι το μοναδικό στάδιο σε αυτό το pipeline — δεν μπορεί να διαγραφεί."
              : opportunityCount === 0
                ? "Δεν υπάρχουν leads σε αυτό το στάδιο."
                : `Υπάρχουν ${opportunityCount} lead${opportunityCount === 1 ? "" : "s"} σε αυτό το στάδιο. Θα μεταφερθούν στο στάδιο "${neighborName}".`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          {canDelete ? (
            <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Διαγραφή..." : "Διαγραφή σταδίου"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Κλείσιμο
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
