"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATE_RANGE_PRESETS, type DateRangePreset } from "@/lib/date-range";

export function DateRangeFilter({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomChange,
}: {
  preset: DateRangePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => onPresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="w-40"
            aria-label="Από ημερομηνία"
          />
          <span className="text-sm text-muted-foreground">έως</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className="w-40"
            aria-label="Έως ημερομηνία"
          />
        </div>
      )}
    </div>
  );
}
