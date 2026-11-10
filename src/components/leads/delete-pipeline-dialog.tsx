"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Pipeline, Stage } from "@/lib/types";

export function DeletePipelineDialog({
  target,
  opportunityCount,
  stageCount,
  campaignCount,
  otherPipelines,
  stages,
  isLastPipeline,
  onOpenChange,
  onConfirm,
}: {
  target: Pipeline | null;
  opportunityCount: number;
  stageCount: number;
  campaignCount: number;
  otherPipelines: Pipeline[];
  stages: Stage[];
  isLastPipeline: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reassignTo: { pipelineId: string; stageId: string } | null) => Promise<void> | void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        {target && (
          <DeletePipelineForm
            target={target}
            opportunityCount={opportunityCount}
            stageCount={stageCount}
            campaignCount={campaignCount}
            otherPipelines={otherPipelines}
            stages={stages}
            isLastPipeline={isLastPipeline}
            onConfirm={onConfirm}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const DELETE_LEADS_TOO = "delete";

function DeletePipelineForm({
  target,
  opportunityCount,
  stageCount,
  campaignCount,
  otherPipelines,
  stages,
  isLastPipeline,
  onConfirm,
  onClose,
}: {
  target: Pipeline;
  opportunityCount: number;
  stageCount: number;
  campaignCount: number;
  otherPipelines: Pipeline[];
  stages: Stage[];
  isLastPipeline: boolean;
  onConfirm: (reassignTo: { pipelineId: string; stageId: string } | null) => Promise<void> | void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<string>(
    otherPipelines[0]?.id ?? DELETE_LEADS_TOO
  );
  const [targetStageId, setTargetStageId] = useState<string>(
    stages.find((s) => s.pipeline_id === otherPipelines[0]?.id)?.id ?? ""
  );
  const [submitting, setSubmitting] = useState(false);

  const stagesForChoice = stages
    .filter((s) => s.pipeline_id === choice)
    .sort((a, b) => a.position - b.position);

  function handlePipelineChoiceChange(value: string) {
    setChoice(value);
    if (value !== DELETE_LEADS_TOO) {
      const firstStage = stages
        .filter((s) => s.pipeline_id === value)
        .sort((a, b) => a.position - b.position)[0];
      setTargetStageId(firstStage?.id ?? "");
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const reassignTo =
        opportunityCount > 0 && choice !== DELETE_LEADS_TOO
          ? { pipelineId: choice, stageId: targetStageId }
          : null;
      await onConfirm(reassignTo);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLastPipeline) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Διαγραφή pipeline &quot;{target.name}&quot;</DialogTitle>
          <DialogDescription>
            Αυτό είναι το μοναδικό pipeline — δεν μπορεί να διαγραφεί.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Κλείσιμο
          </Button>
        </DialogFooter>
      </>
    );
  }

  const canConfirm =
    opportunityCount === 0 || choice === DELETE_LEADS_TOO || Boolean(targetStageId);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Διαγραφή pipeline &quot;{target.name}&quot;</DialogTitle>
        <DialogDescription>
          Θα διαγραφούν {stageCount} στάδι{stageCount === 1 ? "ο" : "α"} και {campaignCount}{" "}
          campaign{campaignCount === 1 ? "" : "s"} αυτού του pipeline.
          {opportunityCount > 0 &&
            ` Υπάρχουν επίσης ${opportunityCount} lead${opportunityCount === 1 ? "" : "s"}.`}
        </DialogDescription>
      </DialogHeader>

      {opportunityCount > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm font-medium">Τι να γίνει με τα {opportunityCount} leads;</p>
          <Select value={choice} onValueChange={handlePipelineChoiceChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {otherPipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  Μεταφορά στο &quot;{p.name}&quot;
                </SelectItem>
              ))}
              <SelectItem value={DELETE_LEADS_TOO}>Διαγραφή των leads μαζί με το pipeline</SelectItem>
            </SelectContent>
          </Select>

          {choice !== DELETE_LEADS_TOO && (
            <Select value={targetStageId} onValueChange={setTargetStageId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Επίλεξε στάδιο" />
              </SelectTrigger>
              <SelectContent>
                {stagesForChoice.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <DialogFooter className="mt-6">
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={submitting || !canConfirm}
        >
          {submitting ? "Διαγραφή..." : "Διαγραφή pipeline"}
        </Button>
      </DialogFooter>
    </>
  );
}
