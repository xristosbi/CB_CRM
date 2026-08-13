"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SEQUENTIAL_BLUE, TOOLTIP_CONTENT_STYLE } from "@/lib/chart-colors";
import type { OpportunityCard } from "@/lib/types";
import { ChartCard, ChartEmptyState } from "./chart-card";
import { useChartPalette } from "./use-chart-palette";

export function SourceBarChart({ opportunities }: { opportunities: OpportunityCard[] }) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const opp of opportunities) {
      const key = opp.source?.trim() || "Άγνωστη πηγή";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [opportunities]);

  const height = Math.max(220, data.length * 40 + 40);
  const palette = useChartPalette();

  return (
    <ChartCard title="Πηγή leads">
      {data.length === 0 ? (
        <ChartEmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={palette.grid} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: palette.axis }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="source"
              width={120}
              tick={{ fontSize: 12, fill: "var(--foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} cursor={{ fill: palette.cursor }} />
            <Bar
              dataKey="count"
              name="Leads"
              fill={SEQUENTIAL_BLUE}
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
