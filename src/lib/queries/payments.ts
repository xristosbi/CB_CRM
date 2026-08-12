import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PaymentStatus } from "@/lib/database.types";
import { PAYMENT_STATUS_LABELS, paymentCurrency } from "@/lib/payment-status";
import type { Payment } from "@/lib/types";

type TypedClient = SupabaseClient<Database>;

interface PaymentRow {
  id: string;
  contact_id: string;
  amount: number;
  status: PaymentStatus;
  invoice_ref: string | null;
  notes: string | null;
  created_at: string;
  contacts: { name: string } | { name: string }[] | null;
}

function mapRow(row: PaymentRow): Payment {
  const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
  return {
    id: row.id,
    contact_id: row.contact_id,
    contact_name: contact?.name ?? "—",
    amount: row.amount,
    status: row.status,
    invoice_ref: row.invoice_ref,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export async function fetchPayments(supabase: TypedClient): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, contact_id, amount, status, invoice_ref, notes, created_at, contacts(name)")
    .order("created_at", { ascending: false })
    .returns<PaymentRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function fetchPaymentsForContact(
  supabase: TypedClient,
  contactId: string
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, contact_id, amount, status, invoice_ref, notes, created_at, contacts(name)")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .returns<PaymentRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

function paymentActivityContent(amount: number, status: PaymentStatus, invoiceRef: string | null) {
  const base = `${paymentCurrency.format(amount)} — ${PAYMENT_STATUS_LABELS[status]}`;
  return invoiceRef ? `${base} (${invoiceRef})` : base;
}

export async function createPayment(
  supabase: TypedClient,
  input: {
    contact_id: string;
    contact_name: string;
    amount: number;
    status: PaymentStatus;
    invoice_ref: string | null;
    notes: string | null;
  }
): Promise<Payment> {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      contact_id: input.contact_id,
      amount: input.amount,
      status: input.status,
      invoice_ref: input.invoice_ref,
      notes: input.notes,
    })
    .select("id, contact_id, amount, status, invoice_ref, notes, created_at")
    .single();
  if (error) throw error;

  await supabase.from("activity_log").insert({
    contact_id: input.contact_id,
    type: "payment",
    content: `Νέα πληρωμή: ${paymentActivityContent(input.amount, input.status, input.invoice_ref)}`,
  });

  return { ...data, contact_name: input.contact_name };
}

export async function updatePayment(
  supabase: TypedClient,
  paymentId: string,
  input: {
    contact_id: string;
    contact_name: string;
    amount: number;
    status: PaymentStatus;
    invoice_ref: string | null;
    notes: string | null;
  }
): Promise<Payment> {
  const { data, error } = await supabase
    .from("payments")
    .update({
      contact_id: input.contact_id,
      amount: input.amount,
      status: input.status,
      invoice_ref: input.invoice_ref,
      notes: input.notes,
    })
    .eq("id", paymentId)
    .select("id, contact_id, amount, status, invoice_ref, notes, created_at")
    .single();
  if (error) throw error;

  await supabase.from("activity_log").insert({
    contact_id: input.contact_id,
    type: "payment",
    content: `Ενημέρωση πληρωμής: ${paymentActivityContent(input.amount, input.status, input.invoice_ref)}`,
  });

  return { ...data, contact_name: input.contact_name };
}

export async function deletePayment(supabase: TypedClient, payment: Payment): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", payment.id);
  if (error) throw error;

  await supabase.from("activity_log").insert({
    contact_id: payment.contact_id,
    type: "payment",
    content: `Διαγραφή πληρωμής: ${paymentActivityContent(payment.amount, payment.status, payment.invoice_ref)}`,
  });
}
