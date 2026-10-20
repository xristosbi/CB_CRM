"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeError } from "@/lib/errors";
import type { Profile } from "@/lib/types";

// Greek-initials fallback, mirroring the SQL trigger's own fallback logic
// (handle_new_user in 0008_users_assignment.sql) — kept in sync by hand
// since one lives in SQL and the other in the browser.
function computeInitials(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (first && last) return (first[0] + last[0]).toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  return "";
}

export function AddUserDialog({
  usingMockData,
  onCreated,
}: {
  usingMockData: boolean;
  onCreated: (profile: Profile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [fullAccess, setFullAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const autoDisplayName = computeInitials(firstName, lastName);
  const effectiveDisplayName = displayNameTouched ? displayName : autoDisplayName;

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setDisplayNameTouched(false);
    setFullAccess(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || password.length < 8) return;

    setSubmitting(true);
    try {
      if (usingMockData) {
        onCreated({
          id: `mock-user-${crypto.randomUUID()}`,
          full_name: [firstName, lastName].filter(Boolean).join(" "),
          display_name: effectiveDisplayName || "—",
          email: email.trim(),
          role: fullAccess ? "admin" : "setter",
          color: null,
          created_at: new Date().toISOString(),
        });
        toast.success("Ο χρήστης προστέθηκε (demo δεδομένα).");
        setOpen(false);
        reset();
        return;
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          displayName: effectiveDisplayName || undefined,
          fullAccess,
        }),
      });
      const data = (await res.json()) as { success: boolean; userId?: string; reason?: string };
      if (!data.success || !data.userId) {
        throw new Error(data.reason ?? "αποτυχία δημιουργίας χρήστη");
      }

      onCreated({
        id: data.userId,
        full_name: [firstName, lastName].filter(Boolean).join(" "),
        display_name: effectiveDisplayName || "—",
        email: email.trim(),
        role: fullAccess ? "admin" : "setter",
        color: null,
        created_at: new Date().toISOString(),
      });
      toast.success("Ο χρήστης προστέθηκε.");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(`Η δημιουργία απέτυχε. ${describeError(err)}`, { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Προσθήκη χρήστη
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Προσθήκη χρήστη</DialogTitle>
            <DialogDescription>
              Δημιουργεί λογαριασμό με προσωρινό κωδικό — πες τον στο άτομο για να συνδεθεί.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-first-name">Όνομα</Label>
                <Input
                  id="user-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-last-name">Επίθετο</Label>
                <Input id="user-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-password">Προσωρινός κωδικός</Label>
              <Input
                id="user-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">Τουλάχιστον 8 χαρακτήρες.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-display-name">Εμφανιζόμενο όνομα</Label>
              <Input
                id="user-display-name"
                value={effectiveDisplayName}
                onChange={(e) => {
                  setDisplayNameTouched(true);
                  setDisplayName(e.target.value);
                }}
                maxLength={20}
              />
            </div>

            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
              <span className="text-sm">Πρόσβαση σε Πληρωμές και Analytics</span>
              <input
                type="checkbox"
                checked={fullAccess}
                onChange={(e) => setFullAccess(e.target.checked)}
                className="size-4"
              />
            </label>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting || !firstName.trim() || !email.trim() || password.length < 8}>
              {submitting ? "Δημιουργία..." : "Δημιουργία χρήστη"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
