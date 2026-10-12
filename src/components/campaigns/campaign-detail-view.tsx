"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadsBoard } from "@/components/leads/leads-board";
import { computeCampaignStatsMap, getCampaignStats } from "@/lib/campaign-stats";
import type { Campaign, OpportunityCard, Pipeline, Stage } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const currency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function CampaignDetailView({
  campaign,
  pipelineName,
  initialPipelines,
  initialStages,
  initialCampaigns,
  initialOpportunities,
  initialNextAppointmentByContact,
  usingMockData,
}: {
  campaign: Campaign;
  pipelineName: string;
  initialPipelines: Pipeline[];
  initialStages: Stage[];
  initialCampaigns: Campaign[];
  initialOpportunities: OpportunityCard[];
  initialNextAppointmentByContact?: Record<string, string>;
  usingMockData: boolean;
}) {
  const stats = useMemo(
    () => getCampaignStats(computeCampaignStatsMap(initialOpportunities, initialStages), campaign.id),
    [initialOpportunities, initialStages, campaign.id]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/campaigns">
              <ArrowLeft className="size-4" />
              Πίσω στα Campaigns
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/leads?pipeline=${campaign.pipeline_id}&campaign=${campaign.id}`}>
              <ExternalLink className="size-4" />
              Άνοιγμα στο Leads
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight" title={campaign.name}>
                {campaign.name}
              </h1>
              {campaign.is_active && (
                <Badge variant="success" className="shrink-0">
                  Ενεργό
                </Badge>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground" title={pipelineName}>
              {pipelineName} · δημιουργήθηκε {dateFormatter.format(new Date(campaign.created_at))}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="text-center">
              <p className="text-lg font-semibold">{stats.leadsCount}</p>
              <p className="text-xs text-muted-foreground">Leads</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{stats.wonCount}</p>
              <p className="text-xs text-muted-foreground">Won</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{currency.format(stats.wonAmount)}</p>
              <p className="text-xs text-muted-foreground">Ποσό (won)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <LeadsBoard
          initialPipelines={initialPipelines}
          initialStages={initialStages}
          initialCampaigns={initialCampaigns}
          initialOpportunities={initialOpportunities}
          initialNextAppointmentByContact={initialNextAppointmentByContact}
          usingMockData={usingMockData}
          lockedCampaignId={campaign.id}
        />
      </div>
    </div>
  );
}
