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
import type { Profile } from "@/lib/types";

export function EditUserDialog({
  target,
  usingMockData,
  canChangeAccess,
  onOpenChange,
  onSave,
}: {
  target: Profile | null;
  usingMockData: boolean;
  // Only an admin editing someone else can flip access — never shown as
  // "admin"/"setter" text, just the one plain-language toggle.
  canChangeAccess: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    target: Profile,
    values: { full_name: string; display_name: string; fullAccess: boolean }
  ) => Promise<void> | void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        {target && (
          <EditUserForm
            target={target}
            usingMockData={usingMockData}
            canChangeAccess={canChangeAccess}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  target,
  usingMockData,
  canChangeAccess,
  onSave,
  onClose,
}: {
  target: Profile;
  usingMockData: boolean;
  canChangeAccess: boolean;
  onSave: (
    target: Profile,
    values: { full_name: string; display_name: string; fullAccess: boolean }
  ) => Promise<void> | void;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(target.full_name ?? "");
  const [displayName, setDisplayName] = useState(target.display_name ?? "");
  const [fullAccess, setFullAccess] = useState(target.role === "admin");
  const [submitting, setSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSubmitting(true);
    try {
      await onSave(target, { full_name: fullName.trim(), display_name: displayName.trim(), fullAccess });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) return;
    setResetting(true);
    try {
      if (usingMockData) {
        toast.success("Ο κωδικός άλλαξε (demo δεδομένα).");
        setNewPassword("");
        return;
      }
      const res = await fetch(`/api/admin/users/${target.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = (await res.json()) as { success: boolean; reason?: string };
      if (!data.success) throw new Error(data.reason ?? "αποτυχία αλλαγής κωδικού");
      toast.success("Ο κωδικός άλλαξε.");
      setNewPassword("");
    } catch (err) {
      toast.error(`Η αλλαγή κωδικού απέτυχε. ${describeError(err)}`, { duration: Infinity });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Επεξεργασία χρήστη</DialogTitle>
          <DialogDescription>{target.email}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-user-full-name">Ονοματεπώνυμο</Label>
            <Input id="edit-user-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-user-display-name">Εμφανιζόμενο όνομα</Label>
            <Input
              id="edit-user-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              required
            />
          </div>

          {canChangeAccess && (
            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
              <span className="text-sm">Πρόσβαση σε Πληρωμές και Analytics</span>
              <input
                type="checkbox"
                checked={fullAccess}
                onChange={(e) => setFullAccess(e.target.checked)}
                className="size-4"
              />
            </label>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button type="submit" disabled={submitting || !displayName.trim()}>
            {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
        </DialogFooter>
      </form>

      {canChangeAccess && (
        <div className="mt-6 border-t pt-4">
          <Label htmlFor="edit-user-new-password">Επαναφορά κωδικού</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="edit-user-new-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Νέος προσωρινός κωδικός"
              minLength={8}
            />
            <Button
              type="button"
              variant="outline"
              disabled={resetting || newPassword.length < 8}
              onClick={handleResetPassword}
            >
              {resetting ? "..." : "Επαναφορά"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Τουλάχιστον 8 χαρακτήρες. Πες τον νέο κωδικό στο άτομο.</p>
        </div>
      )}
    </div>
  );
}
