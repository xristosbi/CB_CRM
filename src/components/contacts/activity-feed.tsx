"use client";

import { Bot, Phone, StickyNote, ArrowRightLeft } from "lucide-react";

import type { ActivityEntry } from "@/lib/types";
import type { ActivityType } from "@/lib/database.types";

const ICONS: Record<ActivityType, typeof Phone> = {
  call: Phone,
  note: StickyNote,
  stage_change: ArrowRightLeft,
  fathom_summary: Bot,
};

const LABELS: Record<ActivityType, string> = {
  call: "Κλήση",
  note: "Σημείωση",
  stage_change: "Αλλαγή σταδίου",
  fathom_summary: "Fathom summary",
};

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ActivityFeed({ activity }: { activity: ActivityEntry[] }) {
  if (activity.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Δεν υπάρχει ακόμα δραστηριότητα.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {activity.map((entry) => {
        const Icon = ICONS[entry.type];
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{LABELS[entry.type]}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(entry.created_at))}
                </span>
              </div>
              {entry.content && (
                <p className="mt-0.5 text-sm whitespace-pre-wrap text-muted-foreground">
                  {entry.content}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
