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

export function DeleteContactDialog({
  open,
  contactName,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  contactName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setConfirming(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Διαγραφή πελάτη &quot;{contactName}&quot;</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>Θα διαγραφούν οριστικά, μαζί με τον πελάτη:</p>
              <ul className="list-disc pl-5">
                <li>Όλα τα opportunities του σε όλα τα pipelines</li>
                <li>Όλο το ιστορικό δραστηριότητας (κλήσεις, σημειώσεις, αλλαγές σταδίου)</li>
                <li>Όλα τα follow-up tasks</li>
                <li>Όλες οι πληρωμές του</li>
              </ul>
              <p className="font-medium text-destructive">
                Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={handleClick} disabled={submitting}>
            {submitting
              ? "Διαγραφή..."
              : confirming
                ? "Σίγουρα; Κλικ ξανά για οριστική διαγραφή"
                : "Διαγραφή πελάτη"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
