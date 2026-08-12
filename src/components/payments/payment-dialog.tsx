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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentStatus } from "@/lib/database.types";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_OPTIONS } from "@/lib/payment-status";
import type { Contact, Payment } from "@/lib/types";

export interface PaymentFormValues {
  contact_id: string;
  contact_name: string;
  amount: number;
  status: PaymentStatus;
  invoice_ref: string | null;
  notes: string | null;
}

export function PaymentDialog({
  open,
  onOpenChange,
  contacts,
  payment,
  lockedContact,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  payment?: Payment | null;
  lockedContact?: { id: string; name: string } | null;
  onSave: (values: PaymentFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted fresh every time the dialog opens, so form state always
            starts from the current payment/lockedContact — no effect needed. */}
        {open && (
          <PaymentForm
            contacts={contacts}
            payment={payment ?? null}
            lockedContact={lockedContact ?? null}
            onSave={onSave}
            onDelete={onDelete}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  contacts,
  payment,
  lockedContact,
  onSave,
  onDelete,
  onClose,
}: {
  contacts: Contact[];
  payment: Payment | null;
  lockedContact: { id: string; name: string } | null;
  onSave: (values: PaymentFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const isEditing = Boolean(payment);

  const [contactId, setContactId] = useState(payment?.contact_id ?? lockedContact?.id ?? "");
  const [contactQuery, setContactQuery] = useState(
    payment?.contact_name ?? lockedContact?.name ?? ""
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [status, setStatus] = useState<PaymentStatus>(payment?.status ?? "pending");
  const [invoiceRef, setInvoiceRef] = useState(payment?.invoice_ref ?? "");
  const [notes, setNotes] = useState(payment?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(contactQuery.trim().toLowerCase())
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!contactId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const contactName =
      lockedContact?.name ??
      contacts.find((c) => c.id === contactId)?.name ??
      payment?.contact_name ??
      contactQuery;

    setSubmitting(true);
    try {
      await onSave({
        contact_id: contactId,
        contact_name: contactName,
        amount: parsedAmount,
        status,
        invoice_ref: invoiceRef.trim() || null,
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
        <DialogTitle>{isEditing ? "Επεξεργασία πληρωμής" : "Νέα πληρωμή"}</DialogTitle>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-4">
        <div className="relative flex flex-col gap-1.5">
          <Label htmlFor="payment-contact">Πελάτης</Label>
          {lockedContact ? (
            <Input id="payment-contact" value={lockedContact.name} disabled />
          ) : (
            <>
              <Input
                id="payment-contact"
                value={contactQuery}
                onChange={(e) => {
                  setContactQuery(e.target.value);
                  setContactId("");
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(!contactId)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Αναζήτηση πελάτη..."
                autoComplete="off"
                required
              />
              {showSuggestions && filteredContacts.length > 0 && (
                <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                  {filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setContactId(c.id);
                        setContactQuery(c.name);
                        setShowSuggestions(false);
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">Ποσό (€)</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PaymentStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {PAYMENT_STATUS_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payment-invoice">Invoice ref (προαιρετικό)</Label>
          <Input
            id="payment-invoice"
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payment-notes">Σημειώσεις</Label>
          <Textarea
            id="payment-notes"
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
        <Button type="submit" disabled={submitting || !contactId}>
          {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </DialogFooter>
    </form>
  );
}
