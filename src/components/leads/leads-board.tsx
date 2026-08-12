"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
  createPipelineWithStages,
  fetchContactSummary,
  insertActivity,
  renameStage,
  updateOpportunityStage,
} from "@/lib/queries/leads";
import type { OpportunityCard, Pipeline, Stage } from "@/lib/types";
import type { ActivityType } from "@/lib/database.types";
import { KanbanColumn } from "./kanban-column";
import { NewPipelineDialog } from "./new-pipeline-dialog";
import { QuickActivityDialog } from "./quick-activity-dialog";

export function LeadsBoard({
  initialPipelines,
  initialStages,
  initialOpportunities,
  usingMockData,
}: {
  initialPipelines: Pipeline[];
  initialStages: Stage[];
  initialOpportunities: OpportunityCard[];
  usingMockData: boolean;
}) {
  const [pipelines, setPipelines] = useState(initialPipelines);
  const [stages, setStages] = useState(initialStages);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [selectedPipelineId, setSelectedPipelineId] = useState(
    initialPipelines[0]?.id ?? ""
  );
  const [quickTarget, setQuickTarget] = useState<OpportunityCard | null>(null);
  const [quickType, setQuickType] = useState<Extract<ActivityType, "call" | "note"> | null>(
    null
  );

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

  const opportunitiesByStage = useMemo(() => {
    const map = new Map<string, OpportunityCard[]>();
    for (const opp of opportunities) {
      if (opp.pipeline_id !== selectedPipelineId) continue;
      const list = map.get(opp.stage_id) ?? [];
      list.push(opp);
      map.set(opp.stage_id, list);
    }
    return map;
  }, [opportunities, selectedPipelineId]);

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
          };

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
                  pipeline_id: row.pipeline_id,
                  stage_id: row.stage_id,
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

  async function handleDragEnd(event: DragEndEvent) {
    const opportunityId = event.active.id as string;
    const newStageId = event.over?.id as string | undefined;
    if (!newStageId) return;

    const current = opportunities.find((o) => o.id === opportunityId);
    if (!current || current.stage_id === newStageId) return;

    const previousStageId = current.stage_id;
    setOpportunities((prev) =>
      prev.map((o) => (o.id === opportunityId ? { ...o, stage_id: newStageId } : o))
    );

    if (usingMockData) return;

    try {
      const supabase = createClient();
      await updateOpportunityStage(supabase, opportunityId, newStageId);
      const fromName = stages.find((s) => s.id === previousStageId)?.name ?? "";
      const toName = stages.find((s) => s.id === newStageId)?.name ?? "";
      await insertActivity(supabase, {
        contact_id: current.contact_id,
        opportunity_id: opportunityId,
        type: "stage_change",
        content: `${fromName} → ${toName}`,
      });
    } catch {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opportunityId ? { ...o, stage_id: previousStageId } : o))
      );
      toast.error("Η ενημέρωση απέτυχε, δοκίμασε ξανά.");
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
      setPipelines((prev) => [...prev, newPipeline]);
      setStages((prev) => [...prev, ...newStages]);
      setSelectedPipelineId(pipelineId);
      return;
    }

    try {
      const supabase = createClient();
      const { pipeline, stages: createdStages } = await createPipelineWithStages(
        supabase,
        name,
        stageNames
      );
      setPipelines((prev) => [...prev, pipeline]);
      setStages((prev) => [...prev, ...createdStages]);
      setSelectedPipelineId(pipeline.id);
      toast.success("Το pipeline δημιουργήθηκε.");
    } catch {
      toast.error("Δεν ήταν δυνατή η δημιουργία του pipeline.");
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
      });
      toast.success("Καταχωρήθηκε.");
    } catch {
      toast.error("Η καταχώρηση απέτυχε.");
    } finally {
      setQuickTarget(null);
      setQuickType(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <Tabs value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
          <TabsList>
            {pipelines.map((pipeline) => (
              <TabsTrigger key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <NewPipelineDialog onCreate={handleCreatePipeline} />
      </div>

      {usingMockData && (
        <div className="border-b bg-warning/10 px-4 py-2 text-xs text-warning-foreground">
          Demo δεδομένα (χωρίς Supabase σύνδεση) — πρόσθεσε NEXT_PUBLIC_SUPABASE_URL /
          NEXT_PUBLIC_SUPABASE_ANON_KEY στο .env.local για πραγματικά δεδομένα.
        </div>
      )}

      <div className="flex-1 overflow-x-auto p-4">
        <DndContext id="leads-board-dnd" sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex h-full gap-3">
            {stagesForPipeline.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opportunities={opportunitiesByStage.get(stage.id) ?? []}
                onQuickCall={(o) => {
                  setQuickTarget(o);
                  setQuickType("call");
                }}
                onQuickNote={(o) => {
                  setQuickTarget(o);
                  setQuickType("note");
                }}
                onRenameStage={handleRenameStage}
              />
            ))}
            {stagesForPipeline.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Αυτό το pipeline δεν έχει στάδια ακόμα.
              </p>
            )}
          </div>
        </DndContext>
      </div>

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
    </div>
  );
}
