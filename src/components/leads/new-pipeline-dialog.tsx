"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";

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

const DEFAULT_STAGES = ["Νέο Lead", "Επικοινωνία", "Qualified", "Πρόταση", "Πληρωμή"];

export function NewPipelineDialog({
  onCreate,
}: {
  onCreate: (name: string, stageNames: string[]) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES);
  const [submitting, setSubmitting] = useState(false);

  function updateStage(index: number, value: string) {
    setStages((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }

  function addStage() {
    setStages((prev) => [...prev, ""]);
  }

  function reset() {
    setName("");
    setStages(DEFAULT_STAGES);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedStages = stages.map((s) => s.trim()).filter(Boolean);
    if (!trimmedName || trimmedStages.length === 0) return;

    setSubmitting(true);
    try {
      await onCreate(trimmedName, trimmedStages);
      setOpen(false);
      reset();
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
        <Button variant="outline" size="sm">
          <Plus className="size-4" />
          Νέο Pipeline
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Νέο Pipeline</DialogTitle>
            <DialogDescription>
              Δώσε όνομα και όρισε τα στάδια (στήλες) του pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pipeline-name">Όνομα pipeline</Label>
              <Input
                id="pipeline-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="π.χ. Chatbot"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Στάδια</Label>
              <div className="flex flex-col gap-2">
                {stages.map((stage, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={stage}
                      onChange={(e) => updateStage(index, e.target.value)}
                      placeholder={`Στάδιο ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label="Αφαίρεση σταδίου"
                      onClick={() => removeStage(index)}
                      disabled={stages.length <= 1}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={addStage}
              >
                <Plus className="size-4" />
                Προσθήκη σταδίου
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Δημιουργία..." : "Δημιουργία pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
