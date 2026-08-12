"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

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
  onQuickCall,
  onQuickNote,
  onRenameStage,
  onDeleteStage,
}: {
  stage: Stage;
  opportunities: OpportunityCardData[];
  onQuickCall: (opportunity: OpportunityCardData) => void;
  onQuickNote: (opportunity: OpportunityCardData) => void;
  onRenameStage: (stageId: string, name: string) => void;
  onDeleteStage: (stage: Stage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
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
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
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
        ref={setNodeRef}
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
