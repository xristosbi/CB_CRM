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
                  {(isAdmin || p.id === currentUser.id) && (
                    <Button variant="ghost" size="sm" onClick={() => setEditTarget(p)}>
                      Επεξεργασία
                    </Button>
                  )}
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
    </div>
  );
}
