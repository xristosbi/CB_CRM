"use client";

import { useDraggable } from "@dnd-kit/core";
import { Phone, StickyNote } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}: {
  opportunity: OpportunityCardData;
  onQuickCall: (opportunity: OpportunityCardData) => void;
  onQuickNote: (opportunity: OpportunityCardData) => void;
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
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/contacts/${opportunity.contact_id}`}
          className="min-w-0 flex-1 text-sm font-medium hover:underline"
        >
          <span className="block truncate">{opportunity.contact_name}</span>
        </Link>
        <button
          type="button"
          aria-label="Μετακίνηση κάρτας"
          className="-mr-1 -mt-1 cursor-grab touch-none rounded p-1 text-muted-foreground active:cursor-grabbing"
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
