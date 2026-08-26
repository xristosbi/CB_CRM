"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OpportunityCard as OpportunityCardData, Stage } from "@/lib/types";
import { OpportunityCard } from "./opportunity-card";

const currency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function KanbanColumn({
  stage,
  opportunities,
  activeDragType,
  onQuickCall,
  onQuickNote,
  onEditOpportunity,
  onDeleteOpportunity,
  onRenameStage,
  onDeleteStage,
}: {
  stage: Stage;
  opportunities: OpportunityCardData[];
  activeDragType: "card" | "column" | null;
  onQuickCall: (opportunity: OpportunityCardData) => void;
  onQuickNote: (opportunity: OpportunityCardData) => void;
  onEditOpportunity: (opportunity: OpportunityCardData) => void;
  onDeleteOpportunity: (opportunity: OpportunityCardData) => void;
  onRenameStage: (stageId: string, name: string) => void;
  onDeleteStage: (stage: Stage) => void;
}) {
  // Column reordering (drag the whole stage) and card dropping (drag a lead
  // into this stage) share one DndContext but must never both be "live"
  // collision targets at once — a card hovering near the header could
  // otherwise resolve against the column-sortable instead of the card zone.
  // Disabling whichever one isn't the active drag type keeps them from
  // fighting over the same pointer position.
  const {
    attributes: columnAttributes,
    listeners: columnListeners,
    setNodeRef: setColumnNodeRef,
    transform: columnTransform,
    transition: columnTransition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: stage.id,
    data: { type: "column", stageId: stage.id },
    disabled: activeDragType === "card",
  });

  const { setNodeRef: setCardZoneRef, isOver } = useDroppable({
    id: `card-zone-${stage.id}`,
    data: { type: "card-zone", stageId: stage.id },
    disabled: activeDragType === "column",
  });

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(stage.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setValue(stage.name);
    setEditing(true);
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const total = opportunities.reduce((sum, o) => sum + (o.value ?? 0), 0);

  function commit() {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed && trimmed !== stage.name) {
      onRenameStage(stage.id, trimmed);
    } else {
      setValue(stage.name);
    }
  }

  return (
    <div
      ref={setColumnNodeRef}
      style={{
        transform: CSS.Transform.toString(columnTransform),
        transition: columnTransition,
      }}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg bg-muted/40",
        isColumnDragging && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button
            type="button"
            aria-label="Μετακίνηση στήλης"
            className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent/60 active:cursor-grabbing"
            {...columnAttributes}
            {...columnListeners}
          >
            <GripVertical className="size-4" />
          </button>
          {editing ? (
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  setValue(stage.name);
                  setEditing(false);
                }
              }}
              className="h-7 px-2 text-sm font-semibold"
            />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={startEditing}
                className="truncate rounded text-sm font-semibold hover:bg-accent/60"
                title="Κλικ για επεξεργασία ονόματος"
              >
                {stage.name}
              </button>
              {stage.is_won && (
                <span className="shrink-0 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                  won
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs text-muted-foreground">{opportunities.length}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label="Επιλογές σταδίου"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={startEditing}>
                <Pencil className="size-4" />
                Μετονομασία
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDeleteStage(stage)}>
                <Trash2 className="size-4" />
                Διαγραφή σταδίου
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {total > 0 && (
        <p className="px-3 pb-2 text-xs text-muted-foreground">{currency.format(total)}</p>
      )}

      <div
        ref={setCardZoneRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 px-2 pb-3 transition-colors",
          isOver && "bg-accent/60"
        )}
      >
        {opportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            onQuickCall={onQuickCall}
            onQuickNote={onQuickNote}
            onEdit={onEditOpportunity}
            onDelete={onDeleteOpportunity}
          />
        ))}
        {opportunities.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Άδειο
          </div>
        )}
      </div>
    </div>
  );
}
