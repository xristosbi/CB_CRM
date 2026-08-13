import type { CSSProperties } from "react";

// Validated categorical palette (light mode) — fixed order, never cycled.
// See dataviz skill reference/palette.md for the CVD-safety rationale.
export const CATEGORICAL_COLORS = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
] as const;

// Folded tail ("Other") when a set exceeds the 8-slot token ceiling.
export const OTHER_COLOR = "#898781";

// Default single hue for sequential/magnitude charts (slot 1).
export const SEQUENTIAL_BLUE = "#2a78d6";
// Second sequential hue, used when two magnitude series appear at once (slot 2).
export const SEQUENTIAL_ORANGE = "#eb6834";

export const CHART_GRID = "#e1e0d9";
export const CHART_AXIS = "#c3c2b7";
export const CHART_MUTED_TEXT = "#898781";
export const CHART_SURFACE = "#fcfcfb";

// Dark-mode counterparts for chart chrome (grid/axis/surface/hover cursor).
// Categorical + sequential series colors stay identical across themes.
export const CHART_GRID_DARK = "#3f3f3f";
export const CHART_AXIS_DARK = "#8a8a8a";
export const CHART_SURFACE_DARK = "#262626";
export const CHART_CURSOR_LIGHT = "rgba(11,11,11,0.04)";
export const CHART_CURSOR_DARK = "rgba(255,255,255,0.06)";

export function categoricalColor(index: number): string {
  return CATEGORICAL_COLORS[index] ?? OTHER_COLOR;
}

export const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: "12px",
  padding: "8px 10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "var(--popover-foreground)",
  fontWeight: 600,
  marginBottom: "2px",
};
