"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Campaign } from "@/lib/types";

export const ALL_CAMPAIGNS_VALUE = "all";

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function CampaignDropdown({
  campaigns,
  selectedCampaignId,
  campaignOpportunityCounts,
  onSelect,
  onRename,
  onActivate,
  onDelete,
  onNewCampaign,
}: {
  campaigns: Campaign[];
  selectedCampaignId: string;
  campaignOpportunityCounts: Map<string, number>;
  onSelect: (campaignId: string) => void;
  onRename: (campaignId: string, name: string) => void;
  onActivate: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  onNewCampaign: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = [...campaigns].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const selected = campaigns.find((c) => c.id === selectedCampaignId) ?? null;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    if (!selected) return;
    setValue(selected.name);
    setEditing(true);
  }

  function commit() {
    const trimmed = value.trim();
    setEditing(false);
    if (selected && trimmed && trimmed !== selected.name) {
      onRename(selected.id, trimmed);
    }
  }

  const selectedCount = selected ? (campaignOpportunityCounts.get(selected.id) ?? 0) : 0;

  return (
    <div className="flex items-center gap-1.5">
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
              setEditing(false);
            }
          }}
          className="h-9 w-56"
        />
      ) : (
        <Select value={selectedCampaignId} onValueChange={onSelect}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
                {campaign.is_active
                  ? " (ενεργό)"
                  : ` — ${dateFormatter.format(new Date(campaign.created_at))}`}
              </SelectItem>
            ))}
            <SelectItem value={ALL_CAMPAIGNS_VALUE}>Όλα</SelectItem>
          </SelectContent>
        </Select>
      )}

      {selected && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Επιλογές campaign"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={startEditing}>
              <Pencil className="size-4" />
              Μετονομασία
            </DropdownMenuItem>
            {!selected.is_active && (
              <DropdownMenuItem onClick={() => onActivate(selected.id)}>
                <CheckCircle2 className="size-4" />
                Κάνε ενεργό
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              disabled={selectedCount > 0}
              onClick={() => onDelete(selected.id)}
            >
              <Trash2 className="size-4" />
              {selectedCount > 0 ? "Διαγραφή (μη άδειο)" : "Διαγραφή"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button variant="outline" size="sm" onClick={onNewCampaign}>
        <Plus className="size-4" />
        Νέο campaign
      </Button>
    </div>
  );
}
