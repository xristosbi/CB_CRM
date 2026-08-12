"use client";

import { cn } from "@/lib/utils";
import type { FollowUpTask } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function TasksPanel({
  tasks,
  onToggle,
}: {
  tasks: FollowUpTask[];
  onToggle: (taskId: string, done: boolean) => void;
}) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Δεν υπάρχουν follow-up tasks.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-start gap-3 rounded-md border p-3 text-sm"
        >
          <input
            type="checkbox"
            checked={task.done}
            onChange={(e) => onToggle(task.id, e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-foreground"
            aria-label={`Ολοκλήρωση: ${task.title}`}
          />
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium", task.done && "text-muted-foreground line-through")}>
              {task.title}
            </p>
            {task.due_at && (
              <p className="text-xs text-muted-foreground">
                {dateFormatter.format(new Date(task.due_at))}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
