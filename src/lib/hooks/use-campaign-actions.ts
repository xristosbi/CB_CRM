"use client";

import { type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { describeError } from "@/lib/errors";
import {
  activateCampaign,
  createCampaignAndActivate,
  deleteCampaignIfEmpty,
  renameCampaign,
} from "@/lib/queries/campaigns";
import { createClient } from "@/lib/supabase/client";
import type { Campaign } from "@/lib/types";

// Shared by the Leads board's campaign dropdown and the /campaigns pages so
// rename/activate/create/delete (optimistic update, rollback on failure,
// persistent-banner error reporting) exist in exactly one place.
export function useCampaignActions({
  campaigns,
  setCampaigns,
  usingMockData,
  reportIssue,
}: {
  campaigns: Campaign[];
  setCampaigns: Dispatch<SetStateAction<Campaign[]>>;
  usingMockData: boolean;
  reportIssue: (message: string, tone?: "error" | "warning") => void;
}) {
  async function createCampaign(pipelineId: string, name: string): Promise<Campaign | null> {
    if (usingMockData) {
      const newCampaign: Campaign = {
        id: `mock-campaign-${crypto.randomUUID()}`,
        pipeline_id: pipelineId,
        name,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setCampaigns((prev) =>
        prev.map((c) => (c.pipeline_id === pipelineId ? { ...c, is_active: false } : c)).concat(newCampaign)
      );
      toast.success("Το campaign δημιουργήθηκε (demo δεδομένα).");
      return newCampaign;
    }

    try {
      const supabase = createClient();
      const created = await createCampaignAndActivate(supabase, pipelineId, name);
      setCampaigns((prev) =>
        prev.map((c) => (c.pipeline_id === pipelineId ? { ...c, is_active: false } : c)).concat(created)
      );
      toast.success("Το campaign δημιουργήθηκε.");
      return created;
    } catch (err) {
      reportIssue(`Η δημιουργία campaign απέτυχε, τίποτα δεν άλλαξε. ${describeError(err)}`);
      return null;
    }
  }

  async function activate(campaignId: string): Promise<boolean> {
    if (usingMockData) {
      const target = campaigns.find((c) => c.id === campaignId);
      if (!target) return false;
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id === campaignId) return { ...c, is_active: true };
          if (c.pipeline_id === target.pipeline_id) return { ...c, is_active: false };
          return c;
        })
      );
      toast.success("Το campaign ενεργοποιήθηκε (demo δεδομένα).");
      return true;
    }

    try {
      const supabase = createClient();
      const updated = await activateCampaign(supabase, campaignId);
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id === campaignId) return updated;
          if (c.pipeline_id === updated.pipeline_id) return { ...c, is_active: false };
          return c;
        })
      );
      toast.success("Το campaign ενεργοποιήθηκε.");
      return true;
    } catch (err) {
      reportIssue(`Η ενεργοποίηση campaign απέτυχε, τίποτα δεν άλλαξε. ${describeError(err)}`);
      return false;
    }
  }

  async function rename(campaignId: string, name: string): Promise<boolean> {
    const previous = campaigns.find((c) => c.id === campaignId)?.name;
    setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, name } : c)));

    if (usingMockData) return true;

    try {
      const supabase = createClient();
      await renameCampaign(supabase, campaignId, name);
      return true;
    } catch (err) {
      if (previous !== undefined) {
        setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, name: previous } : c)));
      }
      reportIssue(`Η μετονομασία campaign απέτυχε. ${describeError(err)}`);
      return false;
    }
  }

  async function remove(campaignId: string, opportunityCount: number): Promise<boolean> {
    if (opportunityCount > 0) {
      toast.error("Το campaign δεν είναι άδειο — δεν μπορεί να διαγραφεί.");
      return false;
    }

    if (usingMockData) {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      toast.success("Το campaign διαγράφηκε (demo δεδομένα).");
      return true;
    }

    try {
      const supabase = createClient();
      await deleteCampaignIfEmpty(supabase, campaignId);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      toast.success("Το campaign διαγράφηκε.");
      return true;
    } catch (err) {
      reportIssue(`Η διαγραφή campaign απέτυχε. ${describeError(err)}`);
      return false;
    }
  }

  return { createCampaign, activate, rename, remove };
}
