import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserLabel } from "@/components/users/user-label";
import type { ContactOpportunity, Profile } from "@/lib/types";

const currency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function OpportunitiesList({
  opportunities,
  profiles,
  onAssign,
}: {
  opportunities: ContactOpportunity[];
  profiles: Profile[];
  onAssign: (opportunityId: string, userId: string | null) => void;
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
        <div
          key={opp.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-accent/40"
        >
          <Link href="/leads" className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{opp.pipeline_name}</Badge>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium">{opp.stage_name}</span>
            {opp.campaign_entity_name && (
              <Badge variant="outline" className="text-[11px]">
                {opp.campaign_entity_name}
              </Badge>
            )}
            {opp.campaign && (
              <span className="text-xs text-muted-foreground">({opp.campaign})</span>
            )}
          </Link>
          <div className="flex items-center gap-3">
            {opp.value != null && <span className="font-medium">{currency.format(opp.value)}</span>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded-md text-xs hover:bg-accent/60">
                  <UserLabel
                    user={
                      opp.assigned_to
                        ? { id: opp.assigned_to, display_name: opp.assigned_to_name, color: null }
                        : null
                    }
                    size="sm"
                    unassignedLabel="Υπεύθυνος: —"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {profiles.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => onAssign(opp.id, p.id)}>
                    <UserLabel user={p} size="sm" />
                  </DropdownMenuItem>
                ))}
                {opp.assigned_to && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onAssign(opp.id, null)}>
                      Αφαίρεση ανάθεσης
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
