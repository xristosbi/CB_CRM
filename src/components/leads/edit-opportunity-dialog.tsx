"use client";

import { useState, type FormEvent } from "react";

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
import type { OpportunityCard } from "@/lib/types";

export function EditOpportunityDialog({
  target,
  onOpenChange,
  onSave,
}: {
  target: OpportunityCard | null;
  onOpenChange: (open: boolean) => void;
  onSave: (values: { value: number | null; campaign: string | null }) => Promise<void> | void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        {target && <EditOpportunityForm target={target} onSave={onSave} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditOpportunityForm({
  target,
  onSave,
  onClose,
}: {
  target: OpportunityCard;
  onSave: (values: { value: number | null; campaign: string | null }) => Promise<void> | void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(target.value != null ? String(target.value) : "");
  const [campaign, setCampaign] = useState(target.campaign ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedValue = value.trim() ? Number(value) : null;
    if (value.trim() && !Number.isFinite(parsedValue)) return;

    setSubmitting(true);
    try {
      await onSave({ value: parsedValue, campaign: campaign.trim() || null });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Επεξεργασία lead</DialogTitle>
        <DialogDescription>{target.contact_name}</DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-value">Αξία (€)</Label>
          <Input
            id="opp-value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-campaign">Καμπάνια</Label>
          <Input id="opp-campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </div>
      </div>

      <DialogFooter className="mt-6">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </DialogFooter>
    </form>
  );
}
