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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Profile } from "@/lib/types";

export function DeleteMemberDialog({
  target,
  otherMembers,
  onOpenChange,
  onConfirm,
}: {
  target: Profile | null;
  otherMembers: Profile[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (reassignTo: string | null) => Promise<void> | void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        {target && (
          <DeleteMemberForm target={target} otherMembers={otherMembers} onConfirm={onConfirm} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const UNASSIGN = "unassign";

function DeleteMemberForm({
  target,
  otherMembers,
  onConfirm,
}: {
  target: Profile;
  otherMembers: Profile[];
  onConfirm: (reassignTo: string | null) => Promise<void> | void;
}) {
  const [choice, setChoice] = useState<string>(UNASSIGN);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm(choice === UNASSIGN ? null : choice);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Διαγραφή μέλους &quot;{target.display_name ?? target.full_name ?? "—"}&quot;</DialogTitle>
        <DialogDescription>
          Τα leads, οι ευκαιρίες και τα ραντεβού που είναι ανατεθειμένα σε αυτό το μέλος δεν θα
          διαγραφούν — απλώς θα μείνουν χωρίς ανάθεση, εκτός αν διαλέξεις να τα μεταφέρεις σε
          άλλο μέλος.
        </DialogDescription>
      </DialogHeader>

      {otherMembers.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <p className="text-sm font-medium">Τι να γίνει με ό,τι είναι ανατεθειμένο σε αυτόν;</p>
          <Select value={choice} onValueChange={setChoice}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGN}>Χωρίς ανάθεση</SelectItem>
              {otherMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  Μεταφορά στον/στην &quot;{m.display_name ?? m.full_name}&quot;
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter className="mt-6">
        <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Διαγραφή..." : "Διαγραφή μέλους"}
        </Button>
      </DialogFooter>
    </>
  );
}
