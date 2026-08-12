"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddStageColumn({
  onAdd,
}: {
  onAdd: (name: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(name.trim());
      setName("");
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="w-72 shrink-0">
        <Button
          variant="ghost"
          className="h-10 w-full justify-start border border-dashed text-muted-foreground"
          onClick={() => setEditing(true)}
        >
          <Plus className="size-4" />
          Νέο στάδιο
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-lg border bg-muted/40 p-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα σταδίου"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setName("");
            }
          }}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Προσθήκη..." : "Προσθήκη"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(false);
              setName("");
            }}
          >
            Άκυρο
          </Button>
        </div>
      </form>
    </div>
  );
}
