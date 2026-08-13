"use client";

import { useMemo } from "react";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SEQUENTIAL_BLUE, SEQUENTIAL_ORANGE, TOOLTIP_CONTENT_STYLE } from "@/lib/chart-colors";
import { paymentCurrency } from "@/lib/payment-status";
import type { Expense, Payment } from "@/lib/types";
import { ChartCard, ChartEmptyState } from "./chart-card";
import { useChartPalette } from "./use-chart-palette";

const MONTHS = 6;

const axisCurrency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function RevenueExpensesChart({
  payments,
  expenses,
}: {
  payments: Payment[];
  expenses: Expense[];
}) {
  const data = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: MONTHS }, (_, i) => {
      const monthDate = subMonths(now, MONTHS - 1 - i);
      return {
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
        month: format(monthDate, "MMM yy"),
        income: 0,
        expenses: 0,
      };
    });

    for (const p of payments) {
      if (p.status !== "paid") continue;
      const d = new Date(p.created_at);
      const bucket = buckets.find((b) => d >= b.start && d <= b.end);
      if (bucket) bucket.income += p.amount;
    }

    for (const e of expenses) {
      const d = new Date(e.date);
      const bucket = buckets.find((b) => d >= b.start && d <= b.end);
      if (bucket) bucket.expenses += e.amount;
    }

    return buckets.map(({ month, income, expenses }) => ({ month, income, expenses }));
  }, [payments, expenses]);

  const total = data.reduce((sum, d) => sum + d.income + d.expenses, 0);
  const palette = useChartPalette();

  return (
    <ChartCard title="Έσοδα vs Έξοδα (6 μήνες)">
      {total === 0 ? (
        <ChartEmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={palette.grid} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: palette.axis }}
              axisLine={{ stroke: palette.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: palette.axis }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v: number) => axisCurrency.format(v)}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              cursor={{ fill: palette.cursor }}
              formatter={(value) => paymentCurrency.format(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Έσοδα" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expenses" name="Έξοδα" fill={SEQUENTIAL_ORANGE} radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
