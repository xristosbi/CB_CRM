"use client";

import { useMemo } from "react";
import { format, startOfWeek, subWeeks } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SEQUENTIAL_BLUE, TOOLTIP_CONTENT_STYLE } from "@/lib/chart-colors";
import type { OpportunityCard } from "@/lib/types";
import { ChartCard, ChartEmptyState } from "./chart-card";
import { useChartPalette } from "./use-chart-palette";

const WEEKS = 12;

export function WeeklyLeadsChart({ opportunities }: { opportunities: OpportunityCard[] }) {
  const data = useMemo(() => {
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const buckets = Array.from({ length: WEEKS }, (_, i) => {
      const start = subWeeks(currentWeekStart, WEEKS - 1 - i);
      return { time: start.getTime(), week: format(start, "dd/MM"), leads: 0 };
    });

    for (const opp of opportunities) {
      const weekStart = startOfWeek(new Date(opp.created_at), { weekStartsOn: 1 }).getTime();
      const bucket = buckets.find((b) => b.time === weekStart);
      if (bucket) bucket.leads += 1;
    }

    return buckets;
  }, [opportunities]);

  const total = data.reduce((sum, d) => sum + d.leads, 0);
  const palette = useChartPalette();

  return (
    <ChartCard title="Νέα leads ανά εβδομάδα (12 εβδομάδες)">
      {total === 0 ? (
        <ChartEmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={palette.grid} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: palette.axis }}
              axisLine={{ stroke: palette.grid }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: palette.axis }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              cursor={{ fill: palette.cursor }}
              labelFormatter={(label) => `Εβδομάδα ${label}`}
            />
            <Bar dataKey="leads" name="Leads" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
