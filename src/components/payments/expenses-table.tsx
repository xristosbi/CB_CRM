"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { paymentCurrency } from "@/lib/payment-status";
import type { Expense } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ExpensesTable({
  expenses,
  onRowClick,
}: {
  expenses: Expense[];
  onRowClick: (expense: Expense) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Περιγραφή</TableHead>
            <TableHead>Κατηγορία</TableHead>
            <TableHead>Ποσό</TableHead>
            <TableHead>Ημερομηνία</TableHead>
            <TableHead className="hidden md:table-cell">Σημειώσεις</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow
              key={expense.id}
              className="cursor-pointer"
              onClick={() => onRowClick(expense)}
            >
              <TableCell className="font-medium">{expense.description}</TableCell>
              <TableCell>
                {expense.category ? (
                  <Badge variant="secondary">{expense.category}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {paymentCurrency.format(expense.amount)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {dateFormatter.format(new Date(expense.date))}
              </TableCell>
              <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                {expense.notes ?? "—"}
              </TableCell>
            </TableRow>
          ))}
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Δεν υπάρχουν έξοδα.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
