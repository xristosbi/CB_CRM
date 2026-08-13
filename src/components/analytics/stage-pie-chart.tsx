"use client";

import { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CATEGORICAL_COLORS, OTHER_COLOR, TOOLTIP_CONTENT_STYLE } from "@/lib/chart-colors";
import type { OpportunityCard, Stage } from "@/lib/types";
import { ChartCard, ChartEmptyState } from "./chart-card";

export function StagePieChart({
  opportunities,
  stages,
}: {
  opportunities: OpportunityCard[];
  stages: Stage[];
}) {
  const data = useMemo(() => {
    const stageById = new Map(stages.map((s) => [s.id, s]));
    const counts = new Map<string, number>();
    const order: string[] = [];

    for (const opp of opportunities) {
      const name = stageById.get(opp.stage_id)?.name ?? "Άγνωστο";
      if (!counts.has(name)) {
        counts.set(name, 0);
        order.push(name);
      }
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    return order
      .map((name) => ({ name, value: counts.get(name) ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({
        ...entry,
        fill: index < CATEGORICAL_COLORS.length ? CATEGORICAL_COLORS[index] : OTHER_COLOR,
      }));
  }, [opportunities, stages]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title="Opportunities ανά στάδιο">
      {total === 0 ? (
        <ChartEmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="46%"
              innerRadius={58}
              outerRadius={98}
              paddingAngle={2}
              stroke="#fcfcfb"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              formatter={(value, name) => {
                const numeric = Number(value);
                const pct = total ? Math.round((numeric / total) * 100) : 0;
                return [`${numeric} (${pct}%)`, name];
              }}
            />
            <Legend verticalAlign="bottom" height={48} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
