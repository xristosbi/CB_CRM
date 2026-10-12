"use client";

import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Campaign, Expense, OpportunityCard, Payment, Pipeline, Stage } from "@/lib/types";
import { ConversionRateCard } from "./conversion-rate-card";
import { RevenueExpensesChart } from "./revenue-expenses-chart";
import { SourceBarChart } from "./source-bar-chart";
import { StagePieChart } from "./stage-pie-chart";
import { WeeklyLeadsChart } from "./weekly-leads-chart";

const dateFormatter = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "short", year: "numeric" });

export function AnalyticsView({
  pipelines,
  stages,
  campaigns,
  opportunities,
  payments,
  expenses,
}: {
  pipelines: Pipeline[];
  stages: Stage[];
  campaigns: Campaign[];
  opportunities: OpportunityCard[];
  payments: Payment[];
  expenses: Expense[];
}) {
  const [selectedPipelineId, setSelectedPipelineId] = useState("all");
  // Defaults to "Όλα" deliberately: switching campaigns on the board must
  // never change history/conversion-rate numbers unless someone explicitly
  // narrows the filter here.
  const [selectedCampaignId, setSelectedCampaignId] = useState("all");

  const campaignsForPipeline = useMemo(
    () =>
      selectedPipelineId === "all"
        ? campaigns
        : campaigns.filter((c) => c.pipeline_id === selectedPipelineId),
    [campaigns, selectedPipelineId]
  );

  const filteredOpportunities = useMemo(() => {
    let result = opportunities;
    if (selectedPipelineId !== "all") {
      result = result.filter((o) => o.pipeline_id === selectedPipelineId);
    }
    if (selectedCampaignId !== "all") {
      result = result.filter((o) => o.campaign_id === selectedCampaignId);
    }
    return result;
  }, [opportunities, selectedPipelineId, selectedCampaignId]);

  const filteredStages = useMemo(
    () =>
      selectedPipelineId === "all"
        ? stages
        : stages.filter((s) => s.pipeline_id === selectedPipelineId),
    [stages, selectedPipelineId]
  );

  function handlePipelineChange(value: string) {
    setSelectedPipelineId(value);
    // The previously selected campaign may belong to a different pipeline
    // (or no longer be in scope) — reset to "Όλα" rather than silently
    // keep filtering by a campaign that's no longer shown as an option.
    setSelectedCampaignId("all");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={selectedPipelineId} onValueChange={handlePipelineChange}>
          <TabsList>
            <TabsTrigger value="all">Όλα τα pipelines</TabsTrigger>
            {pipelines.map((pipeline) => (
              <TabsTrigger key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα τα campaigns</SelectItem>
            {campaignsForPipeline.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
                {campaign.is_active ? " (ενεργό)" : ` — ${dateFormatter.format(new Date(campaign.created_at))}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
