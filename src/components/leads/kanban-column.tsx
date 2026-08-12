"use client";

import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import type { OpportunityCard as OpportunityCardData, Stage } from "@/lib/types";
import { OpportunityCard } from "./opportunity-card";

const currency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function KanbanColumn({
  stage,
  opportunities,
  onQuickCall,
  onQuickNote,
}: {
  stage: Stage;
  opportunities: OpportunityCardData[];
  onQuickCall: (opportunity: OpportunityCardData) => void;
  onQuickNote: (opportunity: OpportunityCardData) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const total = opportunities.reduce((sum, o) => sum + (o.value ?? 0), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{stage.name}</h3>
          {stage.is_won && (
            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
              won
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {opportunities.length}
        </span>
      </div>
      {total > 0 && (
        <p className="px-3 pb-2 text-xs text-muted-foreground">{currency.format(total)}</p>
      )}

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 px-2 pb-3 transition-colors",
          isOver && "bg-accent/60"
        )}
      >
        {opportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            onQuickCall={onQuickCall}
            onQuickNote={onQuickNote}
          />
        ))}
        {opportunities.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Άδειο
          </div>
        )}
      </div>
    </div>
  );
}
