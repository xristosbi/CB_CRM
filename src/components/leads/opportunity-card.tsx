"use client";

import { useDraggable } from "@dnd-kit/core";
import { MoreVertical, Pencil, Phone, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { OpportunityCard as OpportunityCardData } from "@/lib/types";

const currency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function OpportunityCard({
  opportunity,
  onQuickCall,
  onQuickNote,
  onEdit,
  onDelete,
}: {
  opportunity: OpportunityCardData;
  onQuickCall: (opportunity: OpportunityCardData) => void;
  onQuickNote: (opportunity: OpportunityCardData) => void;
  onEdit: (opportunity: OpportunityCardData) => void;
  onDelete: (opportunity: OpportunityCardData) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { stageId: opportunity.stage_id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none rounded-lg border bg-card p-3 shadow-sm",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <Link
          href={`/contacts/${opportunity.contact_id}`}
          className="min-w-0 flex-1 text-sm font-medium hover:underline"
        >
          <span className="block truncate">{opportunity.contact_name}</span>
        </Link>
        <div className="-mt-1 -mr-1 flex shrink-0 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label="Επιλογές lead"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(opportunity)}>
                <Pencil className="size-4" />
                Επεξεργασία
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(opportunity)}>
                <Trash2 className="size-4" />
                Διαγραφή
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            aria-label="Μετακίνηση κάρτας"
            className="cursor-grab touch-none rounded p-1 text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.5" />
              <circle cx="2" cy="8" r="1.5" />
              <circle cx="2" cy="14" r="1.5" />
              <circle cx="10" cy="2" r="1.5" />
              <circle cx="10" cy="8" r="1.5" />
              <circle cx="10" cy="14" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {opportunity.source && (
          <Badge variant="secondary" className="text-[11px]">
            {opportunity.source}
          </Badge>
        )}
        {opportunity.value != null && (
          <span className="text-xs font-medium text-muted-foreground">
            {currency.format(opportunity.value)}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Καταγραφή κλήσης"
          onClick={() => onQuickCall(opportunity)}
        >
          <Phone className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Προσθήκη σημείωσης"
          onClick={() => onQuickNote(opportunity)}
        >
          <StickyNote className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
