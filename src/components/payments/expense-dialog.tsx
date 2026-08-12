"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Expense } from "@/lib/types";

const CATEGORY_SUGGESTIONS = ["Ads", "Software", "Λοιπά"];

export interface ExpenseFormValues {
  description: string;
  amount: number;
  category: string | null;
  date: string;
  notes: string | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  onSave: (values: ExpenseFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ExpenseForm
            expense={expense ?? null}
            onSave={onSave}
            onDelete={onDelete}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ExpenseForm({
  expense,
  onSave,
  onDelete,
  onClose,
}: {
  expense: Expense | null;
  onSave: (values: ExpenseFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const isEditing = Boolean(expense);

  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [date, setDate] = useState(expense?.date ?? today());
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !date) {
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        description: description.trim(),
        amount: parsedAmount,
        category: category.trim() || null,
        date,
        notes: notes.trim() || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Επεξεργασία εξόδου" : "Νέο έξοδο"}</DialogTitle>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-description">Περιγραφή</Label>
          <Input
            id="expense-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-amount">Ποσό (€)</Label>
            <Input
              id="expense-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-date">Ημερομηνία</Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-category">Κατηγορία</Label>
          <Input
            id="expense-category"
            list="expense-category-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="π.χ. Ads"
          />
          <datalist id="expense-category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-notes">Σημειώσεις</Label>
          <Textarea
            id="expense-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter className="mt-6 sm:justify-between">
        {isEditing && onDelete ? (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || submitting}
          >
            {deleting ? "Διαγραφή..." : confirmingDelete ? "Σίγουρα; Κλικ ξανά" : "Διαγραφή"}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </DialogFooter>
    </form>
  );
}
