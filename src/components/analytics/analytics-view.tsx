"use client";

import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Expense, OpportunityCard, Payment, Pipeline, Stage } from "@/lib/types";
import { ConversionRateCard } from "./conversion-rate-card";
import { RevenueExpensesChart } from "./revenue-expenses-chart";
import { SourceBarChart } from "./source-bar-chart";
import { StagePieChart } from "./stage-pie-chart";
import { WeeklyLeadsChart } from "./weekly-leads-chart";

export function AnalyticsView({
  pipelines,
  stages,
  opportunities,
  payments,
  expenses,
}: {
  pipelines: Pipeline[];
  stages: Stage[];
  opportunities: OpportunityCard[];
  payments: Payment[];
  expenses: Expense[];
}) {
  const [selectedPipelineId, setSelectedPipelineId] = useState("all");

  const filteredOpportunities = useMemo(
    () =>
      selectedPipelineId === "all"
        ? opportunities
        : opportunities.filter((o) => o.pipeline_id === selectedPipelineId),
    [opportunities, selectedPipelineId]
  );

  const filteredStages = useMemo(
    () =>
      selectedPipelineId === "all"
        ? stages
        : stages.filter((s) => s.pipeline_id === selectedPipelineId),
    [stages, selectedPipelineId]
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
        <TabsList>
          <TabsTrigger value="all">Όλα τα pipelines</TabsTrigger>
          {pipelines.map((pipeline) => (
            <TabsTrigger key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StagePieChart opportunities={filteredOpportunities} stages={filteredStages} />
        <WeeklyLeadsChart opportunities={filteredOpportunities} />
        <ConversionRateCard opportunities={filteredOpportunities} stages={filteredStages} />
        <SourceBarChart opportunities={filteredOpportunities} />
        <div className="lg:col-span-2">
          <RevenueExpensesChart payments={payments} expenses={expenses} />
        </div>
      </div>
    </div>
  );
}
