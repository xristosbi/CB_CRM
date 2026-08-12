"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentDialog, type PaymentFormValues } from "@/components/payments/payment-dialog";
import { createPayment, deletePayment, updatePayment } from "@/lib/queries/payments";
import { PAYMENT_STATUS_BADGE_VARIANT, PAYMENT_STATUS_LABELS, paymentCurrency } from "@/lib/payment-status";
import { createClient } from "@/lib/supabase/client";
import type { Payment } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ContactPaymentsSection({
  contactId,
  contactName,
  initialPayments,
  usingMockData,
}: {
  contactId: string;
  contactName: string;
  initialPayments: Payment[];
  usingMockData: boolean;
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  function openCreateDialog() {
    setEditingPayment(null);
    setDialogOpen(true);
  }

  function openEditDialog(payment: Payment) {
    setEditingPayment(payment);
    setDialogOpen(true);
  }

  async function handleSave(values: PaymentFormValues) {
    if (usingMockData) {
      if (editingPayment) {
        setPayments((prev) =>
          prev.map((p) => (p.id === editingPayment.id ? { ...p, ...values } : p))
        );
        toast.success("Η πληρωμή ενημερώθηκε (demo δεδομένα).");
      } else {
        setPayments((prev) => [
          { id: `mock-${crypto.randomUUID()}`, ...values, created_at: new Date().toISOString() },
          ...prev,
        ]);
        toast.success("Η πληρωμή προστέθηκε (demo δεδομένα).");
      }
      return;
    }

    try {
      const supabase = createClient();
      if (editingPayment) {
        const updated = await updatePayment(supabase, editingPayment.id, values);
        setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("Η πληρωμή ενημερώθηκε.");
      } else {
        const created = await createPayment(supabase, values);
        setPayments((prev) => [created, ...prev]);
        toast.success("Η πληρωμή προστέθηκε.");
      }
    } catch {
      toast.error("Η αποθήκευση απέτυχε.");
    }
  }

  async function handleDelete() {
    if (!editingPayment) return;
    const target = editingPayment;

    if (usingMockData) {
      setPayments((prev) => prev.filter((p) => p.id !== target.id));
      toast.success("Η πληρωμή διαγράφηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      await deletePayment(supabase, target);
      setPayments((prev) => prev.filter((p) => p.id !== target.id));
      toast.success("Η πληρωμή διαγράφηκε.");
    } catch {
      toast.error("Η διαγραφή απέτυχε.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Πληρωμές</h2>
        <Button type="button" size="sm" variant="outline" onClick={openCreateDialog}>
          Νέα πληρωμή
        </Button>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν πληρωμές ακόμα.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {payments.map((payment) => (
            <button
              key={payment.id}
              type="button"
              onClick={() => openEditDialog(payment)}
              className="rounded-md border p-2.5 text-left text-sm hover:bg-accent/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{paymentCurrency.format(payment.amount)}</span>
                <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[payment.status]}>
                  {PAYMENT_STATUS_LABELS[payment.status]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {dateFormatter.format(new Date(payment.created_at))}
                {payment.invoice_ref && ` · ${payment.invoice_ref}`}
              </p>
            </button>
          ))}
        </div>
      )}

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contacts={[]}
        lockedContact={{ id: contactId, name: contactName }}
        payment={editingPayment}
        onSave={handleSave}
        onDelete={editingPayment ? handleDelete : undefined}
      />
    </div>
  );
}
