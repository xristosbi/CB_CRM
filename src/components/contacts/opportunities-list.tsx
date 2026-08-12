import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ContactOpportunity } from "@/lib/types";

const currency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function OpportunitiesList({
  opportunities,
}: {
  opportunities: ContactOpportunity[];
}) {
  if (opportunities.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Δεν υπάρχουν opportunities ακόμα.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {opportunities.map((opp) => (
        <Link
          key={opp.id}
          href="/leads"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-accent/40"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{opp.pipeline_name}</Badge>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium">{opp.stage_name}</span>
            {opp.campaign && (
              <span className="text-xs text-muted-foreground">({opp.campaign})</span>
            )}
          </div>
          {opp.value != null && (
            <span className="font-medium">{currency.format(opp.value)}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
