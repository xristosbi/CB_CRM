"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

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
import { describeError } from "@/lib/errors";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { updateProfile } from "@/lib/queries/profiles";
import { createClient } from "@/lib/supabase/client";

export function EditProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentUser, updateCurrentUser, usingMockData } = useCurrentUser();
  const [displayName, setDisplayName] = useState(currentUser.display_name ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      if (usingMockData) {
        updateCurrentUser({ display_name: trimmed });
        toast.success("Το προφίλ ενημερώθηκε (demo δεδομένα).");
      } else {
        const supabase = createClient();
        const updated = await updateProfile(supabase, currentUser.id, { display_name: trimmed });
        updateCurrentUser(updated);
        toast.success("Το προφίλ ενημερώθηκε.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(`Η ενημέρωση απέτυχε. ${describeError(err)}`, { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setDisplayName(currentUser.display_name ?? "");
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Προφίλ</DialogTitle>
            <DialogDescription>Το όνομα που εμφανίζεται σε όλο το CRM.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="profile-display-name">Εμφανιζόμενο όνομα</Label>
            <Input
              id="profile-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              required
              autoFocus
            />
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting || !displayName.trim()}>
              {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
