"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/users/user-avatar";
import { describeError } from "@/lib/errors";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { updateProfile } from "@/lib/queries/profiles";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { AddUserDialog } from "./add-user-dialog";
import { DeleteMemberDialog } from "./delete-member-dialog";
import { EditUserDialog } from "./edit-user-dialog";

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function TeamSettings({
  initialProfiles,
  usingMockData,
}: {
  initialProfiles: Profile[];
  usingMockData: boolean;
}) {
  const { currentUser, setProfiles: setContextProfiles, updateCurrentUser } = useCurrentUser();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  const isAdmin = currentUser.role === "admin";
  const visibleProfiles = isAdmin ? profiles : profiles.filter((p) => p.id === currentUser.id);

  function applyProfile(updated: Profile) {
    setProfiles((prev) => (prev.some((p) => p.id === updated.id) ? prev.map((p) => (p.id === updated.id ? updated : p)) : [...prev, updated]));
    setContextProfiles((prev) =>
      prev.some((p) => p.id === updated.id) ? prev.map((p) => (p.id === updated.id ? updated : p)) : [...prev, updated]
    );
    if (updated.id === currentUser.id) updateCurrentUser(updated);
  }

  async function handleSave(
    target: Profile,
    values: { full_name: string; display_name: string; fullAccess: boolean }
  ) {
    const previous = target;
    const optimistic: Profile = {
      ...target,
      full_name: values.full_name,
      display_name: values.display_name,
      role: target.id === currentUser.id ? target.role : values.fullAccess ? "admin" : "setter",
    };
    applyProfile(optimistic);

    if (usingMockData) {
      toast.success("Ο χρήστης ενημερώθηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      const updated = await updateProfile(supabase, target.id, {
        full_name: optimistic.full_name,
        display_name: optimistic.display_name,
        role: optimistic.role,
      });
      applyProfile(updated);
      toast.success("Ο χρήστης ενημερώθηκε.");
    } catch (err) {
      applyProfile(previous);
      toast.error(`Η ενημέρωση απέτυχε. ${describeError(err)}`, { duration: Infinity });
    }
  }

  async function handleDeleteConfirm(reassignTo: string | null) {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;

    if (usingMockData) {
      setProfiles((prev) => prev.filter((p) => p.id !== targetId));
      setContextProfiles((prev) => prev.filter((p) => p.id !== targetId));
      setDeleteTarget(null);
      toast.success("Το μέλος διαγράφηκε (demo δεδομένα).");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassignTo }),
      });
      const data = (await res.json()) as {
        success: boolean;
        mode?: "deleted" | "deactivated";
        reason?: string;
      };
      if (!data.success) throw new Error(data.reason ?? "αποτυχία διαγραφής μέλους");

      setProfiles((prev) => prev.filter((p) => p.id !== targetId));
      setContextProfiles((prev) => prev.filter((p) => p.id !== targetId));

      toast.success(
        data.mode === "deactivated"
          ? "Δεν ήταν δυνατή η πλήρης διαγραφή, οπότε ο λογαριασμός απενεργοποιήθηκε (μπλοκαρισμένη σύνδεση, κρυφός από τις λίστες)."
          : "Το μέλος διαγράφηκε."
      );
    } catch (err) {
      toast.error(`Η διαγραφή απέτυχε. ${describeError(err)}`, { duration: Infinity });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Ομάδα</h2>
        {isAdmin && <AddUserDialog usingMockData={usingMockData} onCreated={(p) => applyProfile(p)} />}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Όνομα</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Μέλος από</TableHead>
              <TableHead className="text-right">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProfiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <UserAvatar user={p} />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{p.display_name ?? "—"}</div>
                  {p.full_name && <div className="text-xs text-muted-foreground">{p.full_name}</div>}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{p.email ?? "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {dateFormatter.format(new Date(p.created_at))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(isAdmin || p.id === currentUser.id) && (
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(p)}>
                        Επεξεργασία
                      </Button>
                    )}
                    {isAdmin && p.id !== currentUser.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        Διαγραφή
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Μόνο ο διαχειριστής μπορεί να διαχειριστεί τα μέλη της ομάδας.
        </p>
      )}

      <EditUserDialog
        target={editTarget}
        usingMockData={usingMockData}
        canChangeAccess={isAdmin && editTarget?.id !== currentUser.id}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSave={handleSave}
      />

      <DeleteMemberDialog
        target={deleteTarget}
        otherMembers={profiles.filter((p) => p.id !== deleteTarget?.id && p.id !== currentUser.id)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
