import type { OpportunityCard, Stage } from "@/lib/types";

export interface CampaignStats {
  leadsCount: number;
  wonCount: number;
  wonAmount: number;
}

const EMPTY_STATS: CampaignStats = { leadsCount: 0, wonCount: 0, wonAmount: 0 };

// One pass over all opportunities, keyed by campaign_id — used by the
// campaigns list (many campaigns at once) and reused as-is for a single
// campaign's header stats (just one map lookup) so the two pages can never
// drift on what counts as "won".
export function computeCampaignStatsMap(
  opportunities: OpportunityCard[],
  stages: Stage[]
): Map<string, CampaignStats> {
  const wonStageIds = new Set(stages.filter((s) => s.is_won).map((s) => s.id));
  const map = new Map<string, CampaignStats>();
  for (const o of opportunities) {
    if (!o.campaign_id) continue;
    const current = map.get(o.campaign_id) ?? { leadsCount: 0, wonCount: 0, wonAmount: 0 };
    current.leadsCount += 1;
    if (wonStageIds.has(o.stage_id)) {
      current.wonCount += 1;
      current.wonAmount += o.value ?? 0;
    }
    map.set(o.campaign_id, current);
  }
  return map;
}

export function getCampaignStats(
  statsMap: Map<string, CampaignStats>,
  campaignId: string
): CampaignStats {
  return statsMap.get(campaignId) ?? EMPTY_STATS;
}
