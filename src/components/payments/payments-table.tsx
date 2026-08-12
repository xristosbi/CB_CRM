"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYMENT_STATUS_BADGE_VARIANT, PAYMENT_STATUS_LABELS, paymentCurrency } from "@/lib/payment-status";
import type { Payment } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function PaymentsTable({
  payments,
  onRowClick,
  showContactColumn = true,
}: {
  payments: Payment[];
  onRowClick: (payment: Payment) => void;
  showContactColumn?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showContactColumn && <TableHead>Πελάτης</TableHead>}
            <TableHead>Ποσό</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ημερομηνία</TableHead>
            <TableHead className="hidden sm:table-cell">Invoice ref</TableHead>
            <TableHead className="hidden md:table-cell">Σημειώσεις</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow
              key={payment.id}
              className="cursor-pointer"
              onClick={() => onRowClick(payment)}
            >
              {showContactColumn && (
                <TableCell>
                  <Link
                    href={`/contacts/${payment.contact_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium hover:underline"
                  >
                    {payment.contact_name}
                  </Link>
                </TableCell>
              )}
              <TableCell className="font-medium">
                {paymentCurrency.format(payment.amount)}
              </TableCell>
              <TableCell>
                <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[payment.status]}>
                  {PAYMENT_STATUS_LABELS[payment.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {dateFormatter.format(new Date(payment.created_at))}
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {payment.invoice_ref ?? "—"}
              </TableCell>
              <TableCell className="hidden max-w-48 truncate text-muted-foreground md:table-cell">
                {payment.notes ?? "—"}
              </TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={showContactColumn ? 6 : 5}
                className="py-8 text-center text-muted-foreground"
              >
                Δεν υπάρχουν πληρωμές.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
