"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactDialog, type ContactFormValues, type OpportunitySelection } from "@/components/contacts/contact-dialog";
import { createLead } from "@/lib/queries/contacts";
import { createClient } from "@/lib/supabase/client";
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
  updateOpportunityStage,
} from "@/lib/queries/leads";
import type { OpportunityCard, Pipeline, Stage } from "@/lib/types";
import type { ActivityType } from "@/lib/database.types";
import { AddStageColumn } from "./add-stage-column";
import { DeleteOpportunityDialog } from "./delete-opportunity-dialog";
import { DeleteStageDialog } from "./delete-stage-dialog";
import { EditOpportunityDialog } from "./edit-opportunity-dialog";
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
  const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null);
  const [editOpportunityTarget, setEditOpportunityTarget] = useState<OpportunityCard | null>(null);
  const [deleteOpportunityTarget, setDeleteOpportunityTarget] = useState<OpportunityCard | null>(
    null
  );
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [activeDragType, setActiveDragType] = useState<"card" | "column" | null>(null);

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
            created_at: string;
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

    try {
      const supabase = createClient();
      await updateOpportunityStage(supabase, opportunityId, newStageId);
      const fromName = stages.find((s) => s.id === previousStageId)?.name ?? "—";
      const toName = stages.find((s) => s.id === newStageId)?.name ?? "—";
      const pipelineName = pipelines.find((p) => p.id === current.pipeline_id)?.name ?? "";
      await insertActivity(supabase, {
        contact_id: current.contact_id,
        opportunity_id: opportunityId,
        type: "stage_change",
        content: `[${pipelineName}] Μετακινήθηκε από "${fromName}" σε "${toName}"`,
      });
    } catch {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opportunityId ? { ...o, stage_id: previousStageId } : o))
      );
      toast.error("Η ενημέρωση απέτυχε, δοκίμασε ξανά.");
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
    } catch {
      setStages(previousStages);
      toast.error("Η αλλαγή σειράς απέτυχε, δοκίμασε ξανά.");
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

  async function handleCreateLead(
    values: ContactFormValues,
    opportunity: OpportunitySelection | null
  ) {
    if (usingMockData) {
      if (opportunity) {
        setOpportunities((prev) => [
          {
            id: `mock-${crypto.randomUUID()}`,
            contact_id: `mock-${crypto.randomUUID()}`,
            contact_name: values.name,
            source: values.source,
            value: null,
            campaign: null,
            pipeline_id: opportunity.pipeline_id,
            stage_id: opportunity.stage_id,
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
      const { contact, opportunityId } = await createLead(supabase, values, opportunity);
      if (opportunity && opportunityId) {
        setOpportunities((prev) => [
          {
            id: opportunityId,
            contact_id: contact.id,
            contact_name: contact.name,
            source: contact.source,
            value: null,
            campaign: null,
            pipeline_id: opportunity.pipeline_id,
            stage_id: opportunity.stage_id,
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
      });
      toast.success("Καταχωρήθηκε.");
    } catch {
      toast.error("Η καταχώρηση απέτυχε.");
    } finally {
      setQuickTarget(null);
      setQuickType(null);
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
      await deleteOpportunity(supabase, target, pipelineName, stageName);
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
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setNewLeadOpen(true)}>
            Νέο lead
          </Button>
          <NewPipelineDialog onCreate={handleCreatePipeline} />
        </div>
      </div>

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
        onSubmit={handleCreateLead}
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
