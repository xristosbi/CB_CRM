"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createExpense, deleteExpense, updateExpense } from "@/lib/queries/expenses";
import { createPayment, deletePayment, updatePayment } from "@/lib/queries/payments";
import { computeDateRange, isWithinRange, type DateRangePreset } from "@/lib/date-range";
import { paymentCurrency } from "@/lib/payment-status";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Expense, Payment } from "@/lib/types";
import type { PaymentStatus } from "@/lib/database.types";
import { DateRangeFilter } from "./date-range-filter";
import { ExpenseDialog, type ExpenseFormValues } from "./expense-dialog";
import { ExpensesTable } from "./expenses-table";
import { PaymentDialog, type PaymentFormValues } from "./payment-dialog";
import { PaymentsTable } from "./payments-table";

type StatusFilter = "all" | PaymentStatus;

function SummaryBox({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${className ?? ""}`}>
        {paymentCurrency.format(value)}
      </p>
    </div>
  );
}

export function FinanceView({
  initialPayments,
  initialExpenses,
  contacts,
  usingMockData,
}: {
  initialPayments: Payment[];
  initialExpenses: Expense[];
  contacts: Contact[];
  usingMockData: boolean;
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [activeTab, setActiveTab] = useState<"payments" | "expenses">("payments");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [rangePreset, setRangePreset] = useState<DateRangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const dateRange = useMemo(
    () => computeDateRange(rangePreset, { from: customFrom, to: customTo }),
    [rangePreset, customFrom, customTo]
  );

  const filteredPayments = useMemo(
    () => (statusFilter === "all" ? payments : payments.filter((p) => p.status === statusFilter)),
    [payments, statusFilter]
  );

  const { paidInRange, pendingInRange, expensesInRange, net } = useMemo(() => {
    const paid = payments
      .filter((p) => p.status === "paid" && isWithinRange(p.created_at, dateRange))
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = payments
      .filter((p) => p.status === "pending" && isWithinRange(p.created_at, dateRange))
      .reduce((sum, p) => sum + p.amount, 0);
    const exp = expenses
      .filter((e) => isWithinRange(e.date, dateRange))
      .reduce((sum, e) => sum + e.amount, 0);
    return { paidInRange: paid, pendingInRange: pending, expensesInRange: exp, net: paid - exp };
  }, [payments, expenses, dateRange]);

  // ---- Payments ----

  function openCreatePayment() {
    setEditingPayment(null);
    setPaymentDialogOpen(true);
  }

  function openEditPayment(payment: Payment) {
    setEditingPayment(payment);
    setPaymentDialogOpen(true);
  }

  async function handleSavePayment(values: PaymentFormValues) {
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

  async function handleDeletePayment() {
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

  // ---- Expenses ----

  function openCreateExpense() {
    setEditingExpense(null);
    setExpenseDialogOpen(true);
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setExpenseDialogOpen(true);
  }

  async function handleSaveExpense(values: ExpenseFormValues) {
    if (usingMockData) {
      if (editingExpense) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === editingExpense.id ? { ...e, ...values } : e))
        );
        toast.success("Το έξοδο ενημερώθηκε (demo δεδομένα).");
      } else {
        setExpenses((prev) => [
          { id: `mock-${crypto.randomUUID()}`, ...values, created_at: new Date().toISOString() },
          ...prev,
        ]);
        toast.success("Το έξοδο προστέθηκε (demo δεδομένα).");
      }
      return;
    }

    try {
      const supabase = createClient();
      if (editingExpense) {
        const updated = await updateExpense(supabase, editingExpense.id, values);
        setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        toast.success("Το έξοδο ενημερώθηκε.");
      } else {
        const created = await createExpense(supabase, values);
        setExpenses((prev) => [created, ...prev]);
        toast.success("Το έξοδο προστέθηκε.");
      }
    } catch {
      toast.error("Η αποθήκευση απέτυχε.");
    }
  }

  async function handleDeleteExpense() {
    if (!editingExpense) return;
    const target = editingExpense;

    if (usingMockData) {
      setExpenses((prev) => prev.filter((e) => e.id !== target.id));
      toast.success("Το έξοδο διαγράφηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      await deleteExpense(supabase, target.id);
      setExpenses((prev) => prev.filter((e) => e.id !== target.id));
      toast.success("Το έξοδο διαγράφηκε.");
    } catch {
      toast.error("Η διαγραφή απέτυχε.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DateRangeFilter
        preset={rangePreset}
        customFrom={customFrom}
        customTo={customTo}
        onPresetChange={setRangePreset}
        onCustomChange={(from, to) => {
          setCustomFrom(from);
          setCustomTo(to);
        }}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryBox label="Εισπραχθέν" value={paidInRange} className="text-success" />
        <SummaryBox label="Εκκρεμή" value={pendingInRange} className="text-warning" />
        <SummaryBox label="Έξοδα" value={expensesInRange} className="text-destructive" />
        <SummaryBox label="Καθαρό" value={net} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "payments" | "expenses")}>
        <TabsList>
          <TabsTrigger value="payments">Πληρωμές</TabsTrigger>
          <TabsTrigger value="expenses">Έξοδα</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">Όλα</TabsTrigger>
                <TabsTrigger value="pending">Εκκρεμεί</TabsTrigger>
                <TabsTrigger value="paid">Πληρώθηκε</TabsTrigger>
                <TabsTrigger value="cancelled">Ακυρώθηκε</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={openCreatePayment}>
              Νέα πληρωμή
            </Button>
          </div>

          <PaymentsTable payments={filteredPayments} onRowClick={openEditPayment} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateExpense}>
              Νέο έξοδο
            </Button>
          </div>

          <ExpensesTable expenses={expenses} onRowClick={openEditExpense} />
        </TabsContent>
      </Tabs>

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        contacts={contacts}
        payment={editingPayment}
        onSave={handleSavePayment}
        onDelete={editingPayment ? handleDeletePayment : undefined}
      />

      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        expense={editingExpense}
        onSave={handleSaveExpense}
        onDelete={editingExpense ? handleDeleteExpense : undefined}
      />
    </div>
  );
}
