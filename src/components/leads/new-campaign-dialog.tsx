"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";

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

export function NewCampaignDialog({
  open,
  pipelineName,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  pipelineName: string;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <NewCampaignForm
            pipelineName={pipelineName}
            onCreate={onCreate}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewCampaignForm({
  pipelineName,
  onCreate,
  onClose,
}: {
  pipelineName: string;
  onCreate: (name: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const defaultName = `${pipelineName} – ${format(new Date(), "LLLL yyyy", { locale: el })}`;
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await onCreate(trimmed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Νέο campaign</DialogTitle>
        <DialogDescription>
          Το board θα αδειάσει — τα τρέχοντα leads παραμένουν ανέγγιχτα στο παλιό campaign και
          παραμένουν προσβάσιμα επιλέγοντάς το από το dropdown.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="campaign-name">Όνομα campaign</Label>
        <Input
          id="campaign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      <DialogFooter className="mt-6">
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Δημιουργία..." : "Δημιουργία campaign"}
        </Button>
      </DialogFooter>
    </form>
  );
}
