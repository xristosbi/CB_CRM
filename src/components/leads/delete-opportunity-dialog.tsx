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
import type { OpportunityCard } from "@/lib/types";

export function DeleteOpportunityDialog({
  target,
  onOpenChange,
  onConfirm,
}: {
  target: OpportunityCard | null;
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
          <DialogTitle>Διαγραφή lead</DialogTitle>
          <DialogDescription>
            Θα διαγραφεί μόνο αυτό το opportunity του &quot;{target?.contact_name}&quot; από αυτό
            το pipeline. Ο πελάτης και τα υπόλοιπα δεδομένα του (σημειώσεις, πληρωμές, άλλα
            opportunities) παραμένουν.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Διαγραφή..." : "Διαγραφή lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
