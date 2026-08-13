"use client";

import { useMemo } from "react";

import type { OpportunityCard, Stage } from "@/lib/types";
import { ChartCard } from "./chart-card";

export function ConversionRateCard({
  opportunities,
  stages,
}: {
  opportunities: OpportunityCard[];
  stages: Stage[];
}) {
  const { rate, won, total } = useMemo(() => {
    const wonStageIds = new Set(stages.filter((s) => s.is_won).map((s) => s.id));
    const wonCount = opportunities.filter((o) => wonStageIds.has(o.stage_id)).length;
    const totalCount = opportunities.length;
    return {
      rate: totalCount ? (wonCount / totalCount) * 100 : 0,
      won: wonCount,
      total: totalCount,
    };
  }, [opportunities, stages]);

  return (
    <ChartCard title="Conversion rate">
      <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-5xl font-semibold">{rate.toFixed(1)}%</p>
        <p className="max-w-[220px] text-sm text-muted-foreground">
          {total === 0
            ? "Δεν υπάρχουν opportunities ακόμα."
            : `${won} από ${total} opportunities έφτασαν σε στάδιο "won"`}
        </p>
      </div>
    </ChartCard>
  );
}
