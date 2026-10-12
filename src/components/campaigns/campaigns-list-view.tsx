"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MoreVertical, Pencil, Search, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeCampaignStatsMap, getCampaignStats } from "@/lib/campaign-stats";
import { useCampaignActions } from "@/lib/hooks/use-campaign-actions";
import { cn } from "@/lib/utils";
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

export function CampaignsListView({
  initialPipelines,
  initialStages,
  initialCampaigns,
  opportunities,
  usingMockData,
}: {
  initialPipelines: Pipeline[];
  initialStages: Stage[];
  initialCampaigns: Campaign[];
  opportunities: OpportunityCard[];
  usingMockData: boolean;
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [search, setSearch] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [banner, setBanner] = useState<{ tone: "error" | "warning"; message: string } | null>(
    null
  );
  const editInputRef = useRef<HTMLInputElement>(null);

  function reportIssue(message: string, tone: "error" | "warning" = "error") {
    setBanner({ tone, message });
  }

  const { activate, rename, remove } = useCampaignActions({
    campaigns,
    setCampaigns,
    usingMockData,
    reportIssue,
  });

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const pipelinesById = useMemo(
    () => new Map(initialPipelines.map((p) => [p.id, p])),
    [initialPipelines]
  );
  const statsMap = useMemo(
    () => computeCampaignStatsMap(opportunities, initialStages),
    [opportunities, initialStages]
  );
  const opportunityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of opportunities) {
      if (!o.campaign_id) continue;
      map.set(o.campaign_id, (map.get(o.campaign_id) ?? 0) + 1);
    }
    return map;
  }, [opportunities]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return campaigns
      .filter((c) => (pipelineFilter === "all" ? true : c.pipeline_id === pipelineFilter))
      .filter((c) => (term ? c.name.toLowerCase().includes(term) : true))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [campaigns, search, pipelineFilter]);

  function startEditing(campaign: Campaign) {
    setEditingId(campaign.id);
    setEditValue(campaign.name);
  }

  function commitEdit(campaign: Campaign) {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (trimmed && trimmed !== campaign.name) {
      rename(campaign.id, trimmed);
    }
  }

  async function handleDelete(campaignId: string) {
    const count = opportunityCounts.get(campaignId) ?? 0;
    await remove(campaignId, count);
  }

  return (
    <div className="flex flex-col gap-4">
      {banner && (
        <div
          role="alert"
          className={cn(
            "flex items-start justify-between gap-3 rounded-md border px-4 py-2.5 text-sm font-medium",
            banner.tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-warning/30 bg-warning/15 text-warning-foreground"
          )}
        >
          <p className="flex-1">{banner.message}</p>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Κλείσιμο μηνύματος"
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση campaign..."
            className="pl-8"
          />
        </div>
        <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
          <SelectTrigger className="w-full overflow-hidden sm:w-auto sm:min-w-[160px] sm:max-w-[220px]">
            <SelectValue>
              <span className="inline-block max-w-[160px] truncate align-middle">
                {pipelineFilter === "all"
                  ? "Όλα τα pipelines"
                  : (initialPipelines.find((p) => p.id === pipelineFilter)?.name ?? "—")}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-[300px]">
            <SelectItem value="all">Όλα τα pipelines</SelectItem>
            {initialPipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id} title={pipeline.name}>
                <span className="inline-block max-w-[220px] truncate align-middle">
                  {pipeline.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Όνομα</TableHead>
              <TableHead className="hidden sm:table-cell">Pipeline</TableHead>
              <TableHead className="hidden md:table-cell">Δημιουργήθηκε</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Won</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Ποσό (won)</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((campaign) => {
              const stats = getCampaignStats(statsMap, campaign.id);
              const pipelineName = pipelinesById.get(campaign.pipeline_id)?.name ?? "—";
              const count = opportunityCounts.get(campaign.id) ?? 0;
              const isEditing = editingId === campaign.id;

              return (
                <TableRow key={campaign.id}>
                  <TableCell className="max-w-[260px]">
                    {isEditing ? (
                      <Input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(campaign)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit(campaign);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        className="h-8"
                      />
                    ) : (
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          title={campaign.name}
                          className="min-w-0 truncate font-medium hover:underline"
                        >
                          {campaign.name}
                        </Link>
                        {campaign.is_active && (
                          <Badge variant="success" className="shrink-0 text-[11px]">
                            Ενεργό
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
                      {pipelineName}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    <span className="truncate" title={pipelineName}>
                      {pipelineName}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {dateFormatter.format(new Date(campaign.created_at))}
                  </TableCell>
                  <TableCell className="text-right">{count}</TableCell>
                  <TableCell className="hidden text-right lg:table-cell">
                    {stats.wonCount}
                  </TableCell>
                  <TableCell className="hidden text-right lg:table-cell">
                    {currency.format(stats.wonAmount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Επιλογές campaign"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(campaign)}>
                          <Pencil className="size-4" />
                          Μετονομασία
                        </DropdownMenuItem>
                        {!campaign.is_active && (
                          <DropdownMenuItem onClick={() => activate(campaign.id)}>
                            <CheckCircle2 className="size-4" />
                            Κάνε ενεργό
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={count > 0}
                          onClick={() => handleDelete(campaign.id)}
                        >
                          <Trash2 className="size-4" />
                          {count > 0 ? "Διαγραφή (μη άδειο)" : "Διαγραφή"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Δεν βρέθηκαν campaigns.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
