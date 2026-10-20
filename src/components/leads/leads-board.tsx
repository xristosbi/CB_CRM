"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { CalendarRange, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactDialog, type ContactFormValues, type OpportunitySelection } from "@/components/contacts/contact-dialog";
import { DateRangeFilter } from "@/components/payments/date-range-filter";
import { describeError } from "@/lib/errors";
import { useCampaignActions } from "@/lib/hooks/use-campaign-actions";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { createLead } from "@/lib/queries/contacts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ensureActiveCampaign } from "@/lib/queries/campaigns";
import {
  addStage,
  createPipelineWithStages,
  deleteOpportunity,
  deleteStage,
  fetchContactSummary,
  insertActivity,
  renameStage,
  reorderStages,
  updateOpportunity,
  updateOpportunityAssignment,
  updateOpportunityStage,
  type LastContactInfo,
} from "@/lib/queries/leads";
import { computeDateRange, isWithinRange, type DateRangePreset } from "@/lib/date-range";
import type { Campaign, OpportunityCard, Pipeline, Stage } from "@/lib/types";
import type { ActivityType } from "@/lib/database.types";
import { AddStageColumn } from "./add-stage-column";
import { ALL_CAMPAIGNS_VALUE, CampaignDropdown } from "./campaign-dropdown";
import { DeleteOpportunityDialog } from "./delete-opportunity-dialog";
import { DeleteStageDialog } from "./delete-stage-dialog";
import { EditOpportunityDialog } from "./edit-opportunity-dialog";
import { KanbanColumn } from "./kanban-column";
import { NewCampaignDialog } from "./new-campaign-dialog";
import { NewPipelineDialog } from "./new-pipeline-dialog";
import { QuickActivityDialog } from "./quick-activity-dialog";

const ASSIGNEE_ALL = "all";
const ASSIGNEE_ME = "me";
const ASSIGNEE_UNASSIGNED = "unassigned";
const ASSIGNEE_STORAGE_KEY = "crm:selected-assignee";

const CONTACT_FILTER_ALL = "all";
const CONTACT_FILTER_NONE = "none";
const CONTACT_FILTER_HAS = "has";
type ContactFilter = typeof CONTACT_FILTER_ALL | typeof CONTACT_FILTER_NONE | typeof CONTACT_FILTER_HAS;

const PIPELINE_STORAGE_KEY = "crm:selected-pipeline";
const CAMPAIGN_STORAGE_PREFIX = "crm:selected-campaign:";

function campaignStorageKey(pipelineId: string) {
  return `${CAMPAIGN_STORAGE_PREFIX}${pipelineId}`;
}

// Same useSyncExternalStore pattern as the theme toggle: reads localStorage
// without a server/client hydration mismatch (getServerSnapshot returns ""
// since there's no DOM on the server; getSnapshot reads the real value once
// hydrated, and React reconciles the difference for us instead of us having
// to setState from an effect).
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readStorageSafe(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorageSafe(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — the URL params
    // still cover back/forward, just skip the extra fallback.
  }
}

function resolveCampaignForPipeline(
  pipelineId: string,
  campaignsList: Campaign[],
  storedValue: string
): string {
  if (storedValue === ALL_CAMPAIGNS_VALUE) return ALL_CAMPAIGNS_VALUE;
  if (storedValue && campaignsList.some((c) => c.id === storedValue && c.pipeline_id === pipelineId)) {
    return storedValue;
  }
  return campaignsList.find((c) => c.pipeline_id === pipelineId && c.is_active)?.id ?? ALL_CAMPAIGNS_VALUE;
}

export function LeadsBoard(props: {
  initialPipelines: Pipeline[];
  initialStages: Stage[];
  initialCampaigns: Campaign[];
  initialOpportunities: OpportunityCard[];
  usingMockData: boolean;
  // contact_id -> next upcoming appointment's starts_at (ISO), for the
  // kanban card's 📅 badge. A plain object (not a Map) since this crosses
  // the server/client component boundary as a prop.
  initialNextAppointmentByContact?: Record<string, string>;
  // contact_id -> most recent call/note (who talked to them, and when), for
  // the kanban card's "📞 name · time ago" indicator and the Επαφή filter.
  initialLastContactByContact?: Record<string, LastContactInfo>;
  // Set by /campaigns/[id]: locks the board to a single pipeline+campaign
  // (no pipeline tabs, no campaign switcher — that page's own header covers
  // name/pipeline/stats, and "Άνοιγμα στο Leads" is the explicit escape
  // hatch to the full, unlocked board).
  lockedCampaignId?: string;
}) {
  // useSearchParams() (used below to persist the selected pipeline/campaign
  // in the URL) requires a Suspense boundary, or Next can't statically
  // prerender the page it's used on.
  return (
    <Suspense>
      <LeadsBoardInner {...props} />
    </Suspense>
  );
}

function LeadsBoardInner({
  initialPipelines,
  initialStages,
  initialCampaigns,
  initialOpportunities,
  initialNextAppointmentByContact,
  initialLastContactByContact,
  usingMockData,
  lockedCampaignId,
}: {
  initialPipelines: Pipeline[];
  initialStages: Stage[];
  initialCampaigns: Campaign[];
  initialOpportunities: OpportunityCard[];
  initialNextAppointmentByContact?: Record<string, string>;
  initialLastContactByContact?: Record<string, LastContactInfo>;
  usingMockData: boolean;
  lockedCampaignId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, profiles } = useCurrentUser();

  const [pipelines, setPipelines] = useState(initialPipelines);
  const [stages, setStages] = useState(initialStages);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [opportunities, setOpportunities] = useState(initialOpportunities);

  const storedPipelineId = useSyncExternalStore(
    subscribeToStorage,
    () => readStorageSafe(PIPELINE_STORAGE_KEY),
    () => ""
  );

  // Selection lives in the URL (?pipeline=&campaign=) first, so it survives
  // browser back/forward, and falls back to localStorage (per pipeline, for
  // the campaign) so it also survives arriving via a plain link (e.g. the
  // sidebar "Leads" item) that carries no query param — only when neither
  // is present does it fall back to the first pipeline / active campaign.
  const [selectedPipelineId, setSelectedPipelineIdState] = useState(() => {
    if (lockedCampaignId) {
      return initialCampaigns.find((c) => c.id === lockedCampaignId)?.pipeline_id ?? "";
    }
    const fromUrl = searchParams.get("pipeline");
    if (fromUrl && initialPipelines.some((p) => p.id === fromUrl)) return fromUrl;
    if (storedPipelineId && initialPipelines.some((p) => p.id === storedPipelineId)) {
      return storedPipelineId;
    }
    return initialPipelines[0]?.id ?? "";
  });

  const storedCampaignId = useSyncExternalStore(
    subscribeToStorage,
    () => readStorageSafe(campaignStorageKey(selectedPipelineId)),
    () => ""
  );

  const [selectedCampaignId, setSelectedCampaignIdState] = useState(() => {
    if (lockedCampaignId) return lockedCampaignId;
    const fromUrl = searchParams.get("campaign");
    if (fromUrl === ALL_CAMPAIGNS_VALUE) return ALL_CAMPAIGNS_VALUE;
    if (fromUrl && initialCampaigns.some((c) => c.id === fromUrl && c.pipeline_id === selectedPipelineId)) {
      return fromUrl;
    }
    return resolveCampaignForPipeline(selectedPipelineId, initialCampaigns, storedCampaignId);
  });

  // Single source of truth for navigating to a (pipeline, campaign) pair:
  // updates both pieces of state, both localStorage keys, and the URL in
  // one shot, so clicking a pipeline tab never leaves the campaign filter
  // pointed at a campaign from a different pipeline.
  function navigateTo(pipelineId: string, campaignId: string) {
    setSelectedPipelineIdState(pipelineId);
    setSelectedCampaignIdState(campaignId);
    writeStorageSafe(PIPELINE_STORAGE_KEY, pipelineId);
    writeStorageSafe(campaignStorageKey(pipelineId), campaignId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("pipeline", pipelineId);
    params.set("campaign", campaignId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setSelectedPipelineId(id: string) {
    const nextCampaignId = resolveCampaignForPipeline(id, campaigns, readStorageSafe(campaignStorageKey(id)));
    navigateTo(id, nextCampaignId);
  }

  function setSelectedCampaignId(id: string) {
    navigateTo(selectedPipelineId, id);
  }

  const storedAssigneeId = useSyncExternalStore(
    subscribeToStorage,
    () => readStorageSafe(ASSIGNEE_STORAGE_KEY),
    () => ""
  );

  // Default follows role, but role itself is never shown — a setter starts
  // on "Εγώ" (their own leads), an admin on "Όλοι".
  const [selectedAssigneeId, setSelectedAssigneeIdState] = useState(() => {
    const fromUrl = searchParams.get("assignee");
    if (fromUrl) return fromUrl;
    if (storedAssigneeId) return storedAssigneeId;
    return currentUser.role === "admin" ? ASSIGNEE_ALL : ASSIGNEE_ME;
  });

  function setSelectedAssigneeId(id: string) {
    setSelectedAssigneeIdState(id);
    writeStorageSafe(ASSIGNEE_STORAGE_KEY, id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("assignee", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const [contactFilter, setContactFilter] = useState<ContactFilter>(CONTACT_FILTER_ALL);

  const [lastContactByContact, setLastContactByContact] = useState<Map<string, LastContactInfo>>(
    () => new Map(Object.entries(initialLastContactByContact ?? {}))
  );

  // Mirrors a URL-supplied pipeline/campaign/assignee into localStorage on
  // mount, so a link that *does* carry the params still keeps the fallback
  // current for the next visit that doesn't.
  useEffect(() => {
    const fromUrlAssignee = searchParams.get("assignee");
    if (fromUrlAssignee) writeStorageSafe(ASSIGNEE_STORAGE_KEY, fromUrlAssignee);

    if (lockedCampaignId) return;
    const fromUrlPipeline = searchParams.get("pipeline");
    const fromUrlCampaign = searchParams.get("campaign");
    if (fromUrlPipeline && initialPipelines.some((p) => p.id === fromUrlPipeline)) {
      writeStorageSafe(PIPELINE_STORAGE_KEY, fromUrlPipeline);
    }
    if (fromUrlCampaign && fromUrlPipeline) {
      const valid =
        fromUrlCampaign === ALL_CAMPAIGNS_VALUE ||
        initialCampaigns.some((c) => c.id === fromUrlCampaign && c.pipeline_id === fromUrlPipeline);
      if (valid) {
        writeStorageSafe(campaignStorageKey(fromUrlPipeline), fromUrlCampaign);
      }
    }
    // Runs once per mount, deliberately — see setSelectedPipelineId/
    // setSelectedCampaignId above for the ongoing (post-mount) writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [quickTarget, setQuickTarget] = useState<OpportunityCard | null>(null);
  const [quickType, setQuickType] = useState<Extract<ActivityType, "call" | "note"> | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null);
  const [editOpportunityTarget, setEditOpportunityTarget] = useState<OpportunityCard | null>(null);
  const [deleteOpportunityTarget, setDeleteOpportunityTarget] = useState<OpportunityCard | null>(
    null
  );
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [activeDragType, setActiveDragType] = useState<"card" | "column" | null>(null);
  const [dragBanner, setDragBanner] = useState<{ tone: "error" | "warning"; message: string } | null>(
    null
  );
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Errors need to stay visible until the user notices them, not vanish
  // with a normal toast timeout. Shows both a non-expiring toast and a
  // banner pinned above the board; only an explicit dismiss (or a later
  // issue replacing it) clears the banner.
  function reportIssue(message: string, tone: "error" | "warning" = "error") {
    setDragBanner({ tone, message });
    if (tone === "error") {
      toast.error(message, { duration: Infinity });
    } else {
      toast.warning(message, { duration: Infinity });
    }
  }

  const { createCampaign, activate: activateCampaignAction, rename: renameCampaignAction, remove: removeCampaignAction } =
    useCampaignActions({ campaigns, setCampaigns, usingMockData, reportIssue });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const stagesForPipeline = useMemo(
    () =>
      stages
        .filter((s) => s.pipeline_id === selectedPipelineId)
        .sort((a, b) => a.position - b.position),
    [stages, selectedPipelineId]
  );

  const campaignsForPipeline = useMemo(
    () => campaigns.filter((c) => c.pipeline_id === selectedPipelineId),
    [campaigns, selectedPipelineId]
  );

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;

  const campaignOpportunityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of opportunities) {
      if (!o.campaign_id) continue;
      map.set(o.campaign_id, (map.get(o.campaign_id) ?? 0) + 1);
    }
    return map;
  }, [opportunities]);

  const nextAppointmentByContact = useMemo(
    () => new Map(Object.entries(initialNextAppointmentByContact ?? {})),
    [initialNextAppointmentByContact]
  );

  const opportunitiesByStage = useMemo(() => {
    const dateRange = dateFilterOpen
      ? computeDateRange(dateRangePreset, { from: customFrom, to: customTo })
      : null;

    const map = new Map<string, OpportunityCard[]>();
    for (const opp of opportunities) {
      if (opp.pipeline_id !== selectedPipelineId) continue;
      if (selectedCampaignId !== ALL_CAMPAIGNS_VALUE && opp.campaign_id !== selectedCampaignId) continue;
      if (dateRange && !isWithinRange(opp.created_at, dateRange)) continue;
      if (selectedAssigneeId === ASSIGNEE_ME && opp.assigned_to !== currentUser.id) continue;
      if (selectedAssigneeId === ASSIGNEE_UNASSIGNED && opp.assigned_to !== null) continue;
      if (
        selectedAssigneeId !== ASSIGNEE_ALL &&
        selectedAssigneeId !== ASSIGNEE_ME &&
        selectedAssigneeId !== ASSIGNEE_UNASSIGNED &&
        opp.assigned_to !== selectedAssigneeId
      ) {
        continue;
      }
      const hasContact = lastContactByContact.has(opp.contact_id);
      if (contactFilter === CONTACT_FILTER_NONE && hasContact) continue;
      if (contactFilter === CONTACT_FILTER_HAS && !hasContact) continue;
      const list = map.get(opp.stage_id) ?? [];
      list.push(opp);
      map.set(opp.stage_id, list);
    }
    return map;
  }, [
    opportunities,
    selectedPipelineId,
    selectedCampaignId,
    dateFilterOpen,
    dateRangePreset,
    customFrom,
    customTo,
    selectedAssigneeId,
    currentUser.id,
    contactFilter,
    lastContactByContact,
  ]);

  // A ref, not a dependency: the realtime subscription itself should only
  // ever be set up once per mount, not torn down and re-created every time
  // someone's profile changes elsewhere (e.g. a Settings edit) while this
  // page happens to stay open — the effect just needs the latest list when
  // an event actually arrives.
  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  // Realtime: reflect leads created/moved elsewhere (e.g. via webhook) instantly.
  useEffect(() => {
    if (usingMockData) return;
    const supabase = createClient();

    const channel = supabase
      .channel("opportunities-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setOpportunities((prev) => prev.filter((o) => o.id !== oldId));
            return;
          }

          const row = payload.new as {
            id: string;
            contact_id: string;
            pipeline_id: string;
            stage_id: string;
            value: number | null;
            campaign: string | null;
            campaign_id: string | null;
            assigned_to: string | null;
            created_at: string;
          };
          const assigneeName = row.assigned_to
            ? profilesRef.current.find((p) => p.id === row.assigned_to)?.display_name ?? null
            : null;

          setOpportunities((prev) => {
            const exists = prev.find((o) => o.id === row.id);
            if (exists) {
              return prev.map((o) =>
                o.id === row.id
                  ? {
                      ...o,
                      pipeline_id: row.pipeline_id,
                      stage_id: row.stage_id,
                      value: row.value,
                      campaign: row.campaign,
                      campaign_id: row.campaign_id,
                      assigned_to: row.assigned_to,
                      assigned_to_name: assigneeName,
                    }
                  : o
              );
            }
            return prev;
          });

          if (payload.eventType === "INSERT") {
            const contact = await fetchContactSummary(supabase, row.contact_id).catch(
              () => null
            );
            setOpportunities((prev) => {
              if (prev.some((o) => o.id === row.id)) return prev;
              return [
                {
                  id: row.id,
                  contact_id: row.contact_id,
                  contact_name: contact?.name ?? "—",
                  source: contact?.source ?? null,
                  value: row.value,
                  campaign: row.campaign,
                  campaign_id: row.campaign_id,
                  pipeline_id: row.pipeline_id,
                  stage_id: row.stage_id,
                  assigned_to: row.assigned_to,
                  assigned_to_name: assigneeName,
                  created_at: row.created_at,
                },
                ...prev,
              ];
            });
            toast.info("Νέο lead", { description: contact?.name ?? undefined });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usingMockData]);

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type;
    setActiveDragType(type === "column" ? "column" : "card");
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragType(null);
    const type = event.active.data.current?.type;
    if (type === "column") {
      handleColumnDragEnd(event);
    } else {
      handleCardDragEnd(event);
    }
  }

  async function handleCardDragEnd(event: DragEndEvent) {
    const opportunityId = event.active.id as string;
    const newStageId = event.over?.data.current?.stageId as string | undefined;
    if (!newStageId) return;

    const current = opportunities.find((o) => o.id === opportunityId);
    if (!current || current.stage_id === newStageId) return;

    const previousStageId = current.stage_id;
    setOpportunities((prev) =>
      prev.map((o) => (o.id === opportunityId ? { ...o, stage_id: newStageId } : o))
    );

    if (usingMockData) return;

    const supabase = createClient();
    const fromName = stages.find((s) => s.id === previousStageId)?.name ?? "—";
    const toName = stages.find((s) => s.id === newStageId)?.name ?? "—";

    // The DB write and the activity-log entry are handled as two separate
    // steps on purpose: unlike a plain UPDATE (which can silently match 0
    // rows under RLS with no error), an INSERT's RLS check always throws on
    // rejection. Sharing one try/catch here would mean a failed activity
    // log write rolls back a stage move that had already succeeded in the
    // DB — misleading the user into thinking the move itself failed.
    try {
      await updateOpportunityStage(supabase, opportunityId, newStageId);
    } catch (err) {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opportunityId ? { ...o, stage_id: previousStageId } : o))
      );
      reportIssue(
        `Η μετακίνηση του "${current.contact_name}" από "${fromName}" σε "${toName}" απέτυχε — παρέμεινε στο "${fromName}". ${describeError(err)}`
      );
      return;
    }

    try {
      const pipelineName = pipelines.find((p) => p.id === current.pipeline_id)?.name ?? "";
      await insertActivity(supabase, {
        contact_id: current.contact_id,
        opportunity_id: opportunityId,
        type: "stage_change",
        content: `[${pipelineName}] Μετακινήθηκε από "${fromName}" σε "${toName}"`,
        user_id: currentUser.id,
      });
    } catch (err) {
      reportIssue(
        `Το "${current.contact_name}" μετακινήθηκε κανονικά σε "${toName}", αλλά δεν καταγράφηκε στο ιστορικό δραστηριότητας. ${describeError(err)}`,
        "warning"
      );
    }
  }

  async function handleColumnDragEnd(event: DragEndEvent) {
    const activeStageId = event.active.id as string;
    const overStageId = event.over?.id as string | undefined;
    if (!overStageId || activeStageId === overStageId) return;

    const oldIndex = stagesForPipeline.findIndex((s) => s.id === activeStageId);
    const newIndex = stagesForPipeline.findIndex((s) => s.id === overStageId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(stagesForPipeline, oldIndex, newIndex);
    const updates = reordered.map((s, index) => ({ id: s.id, position: index }));
    const updateById = new Map(updates.map((u) => [u.id, u.position]));

    const previousStages = stages;
    setStages((prev) =>
      prev.map((s) => (updateById.has(s.id) ? { ...s, position: updateById.get(s.id)! } : s))
    );

    if (usingMockData) return;

    try {
      const supabase = createClient();
      await reorderStages(supabase, updates);
    } catch (err) {
      setStages(previousStages);
      reportIssue(`Η αλλαγή σειράς στηλών απέτυχε, δοκίμασε ξανά. ${describeError(err)}`);
    }
  }

  async function handleCreatePipeline(name: string, stageNames: string[]) {
    if (usingMockData) {
      const pipelineId = `mock-${crypto.randomUUID()}`;
      const newPipeline: Pipeline = { id: pipelineId, name };
      const newStages: Stage[] = stageNames.map((stageName, index) => ({
        id: `mock-${crypto.randomUUID()}`,
        pipeline_id: pipelineId,
        name: stageName,
        position: index,
        is_won: false,
      }));
      const newCampaign: Campaign = {
        id: `mock-campaign-${crypto.randomUUID()}`,
        pipeline_id: pipelineId,
        name: "Αρχικό",
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setPipelines((prev) => [...prev, newPipeline]);
      setStages((prev) => [...prev, ...newStages]);
      setCampaigns((prev) => [...prev, newCampaign]);
      navigateTo(pipelineId, newCampaign.id);
      return;
    }

    try {
      const supabase = createClient();
      const { pipeline, stages: createdStages } = await createPipelineWithStages(
        supabase,
        name,
        stageNames
      );
      const campaign = await ensureActiveCampaign(supabase, pipeline.id);
      setPipelines((prev) => [...prev, pipeline]);
      setStages((prev) => [...prev, ...createdStages]);
      setCampaigns((prev) => [
        ...prev,
        { id: campaign.id, pipeline_id: pipeline.id, name: "Αρχικό", is_active: true, created_at: new Date().toISOString() },
      ]);
      navigateTo(pipeline.id, campaign.id);
      toast.success("Το pipeline δημιουργήθηκε.");
    } catch {
      toast.error("Δεν ήταν δυνατή η δημιουργία του pipeline.");
    }
  }

  async function handleCreateLead(
    values: ContactFormValues,
    opportunity: OpportunitySelection | null
  ) {
    if (usingMockData) {
      if (opportunity) {
        const activeCampaignId =
          campaigns.find((c) => c.pipeline_id === opportunity.pipeline_id && c.is_active)?.id ?? null;
        const assigneeName = opportunity.assigned_to
          ? profiles.find((p) => p.id === opportunity.assigned_to)?.display_name ?? null
          : null;
        setOpportunities((prev) => [
          {
            id: `mock-${crypto.randomUUID()}`,
            contact_id: `mock-${crypto.randomUUID()}`,
            contact_name: values.name,
            source: values.source,
            value: null,
            campaign: null,
            campaign_id: activeCampaignId,
            pipeline_id: opportunity.pipeline_id,
            stage_id: opportunity.stage_id,
            assigned_to: opportunity.assigned_to,
            assigned_to_name: assigneeName,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      toast.success("Το lead δημιουργήθηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      let campaignId: string | null = null;
      if (opportunity) {
        const active = await ensureActiveCampaign(supabase, opportunity.pipeline_id);
        campaignId = active.id;
        if (!campaigns.some((c) => c.id === campaignId)) {
          setCampaigns((prev) => [
            ...prev,
            {
              id: active.id,
              pipeline_id: opportunity.pipeline_id,
              name: "Αρχικό",
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }
      const { contact, opportunityId } = await createLead(
        supabase,
        values,
        opportunity ? { ...opportunity, campaign_id: campaignId } : null,
        currentUser.id
      );
      if (opportunity && opportunityId) {
        const assigneeName = opportunity.assigned_to
          ? profiles.find((p) => p.id === opportunity.assigned_to)?.display_name ?? null
          : null;
        setOpportunities((prev) => [
          {
            id: opportunityId,
            contact_id: contact.id,
            contact_name: contact.name,
            source: contact.source,
            value: null,
            campaign: null,
            campaign_id: campaignId,
            pipeline_id: opportunity.pipeline_id,
            stage_id: opportunity.stage_id,
            assigned_to: opportunity.assigned_to,
            assigned_to_name: assigneeName,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      toast.success("Το lead δημιουργήθηκε.");
    } catch {
      toast.error("Δεν ήταν δυνατή η δημιουργία του lead.");
    }
  }

  async function handleRenameStage(stageId: string, name: string) {
    const previous = stages.find((s) => s.id === stageId)?.name;
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name } : s)));

    if (usingMockData) return;

    try {
      const supabase = createClient();
      await renameStage(supabase, stageId, name);
    } catch {
      if (previous !== undefined) {
        setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name: previous } : s)));
      }
      toast.error("Η μετονομασία απέτυχε.");
    }
  }

  async function handleAddStage(name: string) {
    const pipelineStages = stages.filter((s) => s.pipeline_id === selectedPipelineId);
    const position = pipelineStages.length
      ? Math.max(...pipelineStages.map((s) => s.position)) + 1
      : 0;

    if (usingMockData) {
      setStages((prev) => [
        ...prev,
        {
          id: `mock-${crypto.randomUUID()}`,
          pipeline_id: selectedPipelineId,
          name,
          position,
          is_won: false,
        },
      ]);
      return;
    }

    try {
      const supabase = createClient();
      const created = await addStage(supabase, selectedPipelineId, name, position);
      setStages((prev) => [...prev, created]);
    } catch {
      toast.error("Δεν ήταν δυνατή η προσθήκη σταδίου.");
    }
  }

  // ---------------------------------------------------------------------
  // Campaigns
  // ---------------------------------------------------------------------

  async function handleCreateCampaign(name: string) {
    const created = await createCampaign(selectedPipelineId, name);
    if (created) navigateTo(selectedPipelineId, created.id);
  }

  async function handleActivateCampaign(campaignId: string) {
    await activateCampaignAction(campaignId);
  }

  async function handleRenameCampaign(campaignId: string, name: string) {
    await renameCampaignAction(campaignId, name);
  }

  async function handleDeleteCampaign(campaignId: string) {
    const count = campaignOpportunityCounts.get(campaignId) ?? 0;
    const deleted = await removeCampaignAction(campaignId, count);
    if (deleted && selectedCampaignId === campaignId) {
      setSelectedCampaignId(ALL_CAMPAIGNS_VALUE);
    }
  }

  const deleteTargetOpportunityCount = deleteTarget
    ? opportunities.filter((o) => o.stage_id === deleteTarget.id).length
    : 0;
  const deleteTargetNeighbor = deleteTarget
    ? (() => {
        const siblings = stages
          .filter((s) => s.pipeline_id === deleteTarget.pipeline_id)
          .sort((a, b) => a.position - b.position);
        const index = siblings.findIndex((s) => s.id === deleteTarget.id);
        return siblings[index - 1] ?? siblings[index + 1] ?? null;
      })()
    : null;

  async function handleConfirmDeleteStage() {
    if (!deleteTarget) return;
    const canDelete = deleteTargetNeighbor !== null || deleteTargetOpportunityCount === 0;
    if (!canDelete) {
      setDeleteTarget(null);
      return;
    }

    const affectedIds = opportunities
      .filter((o) => o.stage_id === deleteTarget.id)
      .map((o) => o.id);

    try {
      if (!usingMockData) {
        const supabase = createClient();
        await deleteStage(
          supabase,
          deleteTarget.id,
          affectedIds.length > 0 ? (deleteTargetNeighbor?.id ?? null) : null
        );
      }
      if (affectedIds.length > 0 && deleteTargetNeighbor) {
        setOpportunities((prev) =>
          prev.map((o) =>
            o.stage_id === deleteTarget.id ? { ...o, stage_id: deleteTargetNeighbor.id } : o
          )
        );
      }
      setStages((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success("Το στάδιο διαγράφηκε.");
    } catch {
      toast.error("Η διαγραφή απέτυχε.");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleQuickActivitySubmit(content: string) {
    if (!quickTarget || !quickType) return;
    if (!content.trim()) {
      setQuickTarget(null);
      setQuickType(null);
      return;
    }

    if (usingMockData) {
      toast.success("Καταχωρήθηκε (demo δεδομένα, δεν αποθηκεύεται).");
      setQuickTarget(null);
      setQuickType(null);
      return;
    }

    try {
      const supabase = createClient();
      await insertActivity(supabase, {
        contact_id: quickTarget.contact_id,
        opportunity_id: quickTarget.id,
        type: quickType,
        content: content.trim(),
        user_id: currentUser.id,
      });
      setLastContactByContact((prev) => {
        const next = new Map(prev);
        next.set(quickTarget.contact_id, {
          type: quickType,
          user_id: currentUser.id,
          user_name: currentUser.display_name,
          created_at: new Date().toISOString(),
        });
        return next;
      });
      toast.success("Καταχωρήθηκε.");
    } catch {
      toast.error("Η καταχώρηση απέτυχε.");
    } finally {
      setQuickTarget(null);
      setQuickType(null);
    }
  }

  async function handleAssignOpportunity(opportunity: OpportunityCard, userId: string | null) {
    const previousAssignedTo = opportunity.assigned_to;
    const previousAssignedToName = opportunity.assigned_to_name;
    const nextName = userId ? profiles.find((p) => p.id === userId)?.display_name ?? null : null;

    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === opportunity.id ? { ...o, assigned_to: userId, assigned_to_name: nextName } : o
      )
    );

    if (usingMockData) {
      toast.success(
        userId ? "Η ανάθεση ενημερώθηκε (demo δεδομένα)." : "Η ανάθεση αφαιρέθηκε (demo δεδομένα)."
      );
      return;
    }

    const supabase = createClient();

    // Same two-step convention as the drag-and-drop stage change: the
    // assignment write must roll back the optimistic update on failure,
    // but a failed activity-log write afterwards must not undo an
    // assignment that already succeeded — warn only.
    try {
      await updateOpportunityAssignment(supabase, opportunity.id, userId);
    } catch (err) {
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === opportunity.id
            ? { ...o, assigned_to: previousAssignedTo, assigned_to_name: previousAssignedToName }
            : o
        )
      );
      reportIssue(`Η ανάθεση απέτυχε, παρέμεινε όπως ήταν. ${describeError(err)}`);
      return;
    }

    try {
      const content = userId
        ? `Ανατέθηκε σε ${nextName ?? "—"} από ${currentUser.display_name ?? "—"}`
        : `Αφαιρέθηκε η ανάθεση από ${currentUser.display_name ?? "—"}`;
      await insertActivity(supabase, {
        contact_id: opportunity.contact_id,
        opportunity_id: opportunity.id,
        type: "note",
        content,
        user_id: currentUser.id,
      });
    } catch (err) {
      reportIssue(
        `Η ανάθεση ενημερώθηκε κανονικά, αλλά δεν καταγράφηκε στο ιστορικό δραστηριότητας. ${describeError(err)}`,
        "warning"
      );
    }
  }

  async function handleEditOpportunitySave(values: { value: number | null; campaign: string | null }) {
    if (!editOpportunityTarget) return;
    const targetId = editOpportunityTarget.id;

    setOpportunities((prev) =>
      prev.map((o) => (o.id === targetId ? { ...o, ...values } : o))
    );

    if (usingMockData) return;

    try {
      const supabase = createClient();
      await updateOpportunity(supabase, targetId, values);
    } catch {
      toast.error("Η ενημέρωση απέτυχε.");
    }
  }

  async function handleDeleteOpportunityConfirm() {
    if (!deleteOpportunityTarget) return;
    const target = deleteOpportunityTarget;

    setOpportunities((prev) => prev.filter((o) => o.id !== target.id));

    if (usingMockData) {
      setDeleteOpportunityTarget(null);
      toast.success("Το lead διαγράφηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      const pipelineName = pipelines.find((p) => p.id === target.pipeline_id)?.name ?? "";
      const stageName = stages.find((s) => s.id === target.stage_id)?.name ?? "";
      await deleteOpportunity(supabase, target, pipelineName, stageName, currentUser.id);
      toast.success("Το lead διαγράφηκε.");
    } catch {
      setOpportunities((prev) => [target, ...prev]);
      toast.error("Η διαγραφή απέτυχε.");
    } finally {
      setDeleteOpportunityTarget(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {!lockedCampaignId && (
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
              <TabsList>
                {pipelines.map((pipeline) => (
                  <TabsTrigger key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setNewLeadOpen(true)}>
                Νέο lead
              </Button>
              <NewPipelineDialog onCreate={handleCreatePipeline} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CampaignDropdown
              campaigns={campaignsForPipeline}
              selectedCampaignId={selectedCampaignId}
              campaignOpportunityCounts={campaignOpportunityCounts}
              onSelect={setSelectedCampaignId}
              onRename={handleRenameCampaign}
              onActivate={handleActivateCampaign}
              onDelete={handleDeleteCampaign}
              onNewCampaign={() => setNewCampaignOpen(true)}
            />
            {selectedCampaign && !selectedCampaign.is_active && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                Παλιό campaign
              </span>
            )}

            <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
              <SelectTrigger size="sm" className="w-auto gap-1.5">
                <span className="text-muted-foreground">Υπεύθυνος:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ASSIGNEE_ALL}>Όλοι</SelectItem>
                <SelectItem value={ASSIGNEE_ME}>Εγώ</SelectItem>
                {profiles
                  .filter((p) => p.id !== currentUser.id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name ?? "—"}
                    </SelectItem>
                  ))}
                <SelectItem value={ASSIGNEE_UNASSIGNED}>Μη ανατεθειμένα</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contactFilter} onValueChange={(v) => setContactFilter(v as ContactFilter)}>
              <SelectTrigger size="sm" className="w-auto gap-1.5">
                <span className="text-muted-foreground">Επαφή:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CONTACT_FILTER_ALL}>Όλα</SelectItem>
                <SelectItem value={CONTACT_FILTER_NONE}>Χωρίς επαφή</SelectItem>
                <SelectItem value={CONTACT_FILTER_HAS}>Με επαφή</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateFilterOpen((prev) => !prev)}
              className={cn(dateFilterOpen && "bg-accent")}
            >
              <CalendarRange className="size-4" />
              Ημερομηνία
            </Button>
            {dateFilterOpen && (
              <DateRangeFilter
                preset={dateRangePreset}
                customFrom={customFrom}
                customTo={customTo}
                onPresetChange={setDateRangePreset}
                onCustomChange={(from, to) => {
                  setCustomFrom(from);
                  setCustomTo(to);
                }}
              />
            )}
          </div>
        </div>
      )}

      {dragBanner && (
        <div
          role="alert"
          className={cn(
            "flex items-start justify-between gap-3 border-b px-4 py-2.5 text-sm font-medium",
            dragBanner.tone === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/15 text-warning-foreground"
          )}
        >
          <p className="flex-1">{dragBanner.message}</p>
          <button
            type="button"
            onClick={() => setDragBanner(null)}
            aria-label="Κλείσιμο μηνύματος"
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {usingMockData && (
        <div className="border-b bg-warning/10 px-4 py-2 text-xs text-warning-foreground">
          Demo δεδομένα (χωρίς Supabase σύνδεση) — πρόσθεσε NEXT_PUBLIC_SUPABASE_URL /
          NEXT_PUBLIC_SUPABASE_ANON_KEY στο .env.local για πραγματικά δεδομένα.
        </div>
      )}

      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          id="leads-board-dnd"
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragType(null)}
        >
          <SortableContext
            items={stagesForPipeline.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex h-full gap-3">
              {stagesForPipeline.map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  opportunities={opportunitiesByStage.get(stage.id) ?? []}
                  activeDragType={activeDragType}
                  nextAppointmentByContact={nextAppointmentByContact}
                  lastContactByContact={lastContactByContact}
                  profiles={profiles}
                  onQuickCall={(o) => {
                    setQuickTarget(o);
                    setQuickType("call");
                  }}
                  onQuickNote={(o) => {
                    setQuickTarget(o);
                    setQuickType("note");
                  }}
                  onEditOpportunity={setEditOpportunityTarget}
                  onDeleteOpportunity={setDeleteOpportunityTarget}
                  onAssignOpportunity={handleAssignOpportunity}
                  onRenameStage={handleRenameStage}
                  onDeleteStage={setDeleteTarget}
                />
              ))}
              {selectedPipelineId && <AddStageColumn onAdd={handleAddStage} />}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <DeleteStageDialog
        target={deleteTarget}
        opportunityCount={deleteTargetOpportunityCount}
        neighborName={deleteTargetNeighbor?.name ?? null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDeleteStage}
      />

      <QuickActivityDialog
        target={quickTarget}
        type={quickType}
        onOpenChange={(open) => {
          if (!open) {
            setQuickTarget(null);
            setQuickType(null);
          }
        }}
        onSubmit={handleQuickActivitySubmit}
      />

      <ContactDialog
        open={newLeadOpen}
        onOpenChange={setNewLeadOpen}
        mode="create"
        pipelines={pipelines}
        stages={stages}
        defaultPipelineId={selectedPipelineId}
        profiles={profiles}
        currentUserId={currentUser.id}
        onSubmit={handleCreateLead}
      />

      <NewCampaignDialog
        open={newCampaignOpen}
        pipelineName={pipelines.find((p) => p.id === selectedPipelineId)?.name ?? ""}
        onOpenChange={setNewCampaignOpen}
        onCreate={handleCreateCampaign}
      />

      <EditOpportunityDialog
        target={editOpportunityTarget}
        onOpenChange={(open) => {
          if (!open) setEditOpportunityTarget(null);
        }}
        onSave={handleEditOpportunitySave}
      />

      <DeleteOpportunityDialog
        target={deleteOpportunityTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteOpportunityTarget(null);
        }}
        onConfirm={handleDeleteOpportunityConfirm}
      />
    </div>
  );
}
