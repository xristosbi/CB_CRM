"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPayment, deletePayment, updatePayment } from "@/lib/queries/payments";
import { paymentCurrency } from "@/lib/payment-status";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Payment } from "@/lib/types";
import type { PaymentStatus } from "@/lib/database.types";
import { PaymentDialog, type PaymentFormValues } from "./payment-dialog";
import { PaymentsTable } from "./payments-table";

type StatusFilter = "all" | PaymentStatus;

function isSameMonth(dateStr: string, reference: Date) {
  const d = new Date(dateStr);
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
}

export function PaymentsView({
  initialPayments,
  contacts,
  usingMockData,
}: {
  initialPayments: Payment[];
  contacts: Contact[];
  usingMockData: boolean;
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const filteredPayments = useMemo(
    () => (statusFilter === "all" ? payments : payments.filter((p) => p.status === statusFilter)),
    [payments, statusFilter]
  );

  const { paidThisMonth, pendingTotal } = useMemo(() => {
    const now = new Date();
    return {
      paidThisMonth: payments
        .filter((p) => p.status === "paid" && isSameMonth(p.created_at, now))
        .reduce((sum, p) => sum + p.amount, 0),
      pendingTotal: payments
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

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
          {
            id: `mock-${crypto.randomUUID()}`,
            ...values,
            created_at: new Date().toISOString(),
          },
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Εισπραχθέν (τρέχων μήνας)</p>
          <p className="mt-1 text-xl font-semibold text-success">
            {paymentCurrency.format(paidThisMonth)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Σύνολο εκκρεμών</p>
          <p className="mt-1 text-xl font-semibold text-warning">
            {paymentCurrency.format(pendingTotal)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">Όλα</TabsTrigger>
            <TabsTrigger value="pending">Εκκρεμεί</TabsTrigger>
            <TabsTrigger value="paid">Πληρώθηκε</TabsTrigger>
            <TabsTrigger value="cancelled">Ακυρώθηκε</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={openCreateDialog}>
          Νέα πληρωμή
        </Button>
      </div>

      <PaymentsTable payments={filteredPayments} onRowClick={openEditDialog} />

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contacts={contacts}
        payment={editingPayment}
        onSave={handleSave}
        onDelete={editingPayment ? handleDelete : undefined}
      />
    </div>
  );
}
