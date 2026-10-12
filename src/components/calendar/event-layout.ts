import type { CalendarEvent } from "@/lib/types";

export interface PositionedEvent {
  event: CalendarEvent;
  col: number;
  cols: number;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Side-by-side column layout for same-day overlapping events (e.g. two
// calls booked at once) — a simple greedy sweep, not pixel-perfect but
// keeps overlapping events visible side by side instead of stacked on top
// of each other.
export function layoutDayEvents(dayEvents: CalendarEvent[]): PositionedEvent[] {
  const sorted = [...dayEvents].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const result: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let clusterEnd = "";

  function flushCluster() {
    if (cluster.length === 0) return;
    const maxCol = Math.max(...cluster.map((c) => c.col)) + 1;
    for (const c of cluster) {
      c.cols = maxCol;
      result.push(c);
    }
    cluster = [];
  }

  for (const event of sorted) {
    if (cluster.length > 0 && event.starts_at >= clusterEnd) {
      flushCluster();
      clusterEnd = "";
    }
    let col = 0;
    while (
      cluster.some(
        (c) => c.col === col && overlaps(c.event.starts_at, c.event.ends_at, event.starts_at, event.ends_at)
      )
    ) {
      col++;
    }
    cluster.push({ event, col, cols: 1 });
    clusterEnd = clusterEnd && clusterEnd > event.ends_at ? clusterEnd : event.ends_at;
  }
  flushCluster();
  return result;
}
