"use client";

import { useTheme } from "@/components/theme/theme-provider";
import {
  CHART_AXIS,
  CHART_AXIS_DARK,
  CHART_CURSOR_DARK,
  CHART_CURSOR_LIGHT,
  CHART_GRID,
  CHART_GRID_DARK,
  CHART_SURFACE,
  CHART_SURFACE_DARK,
} from "@/lib/chart-colors";

export function useChartPalette() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return {
    grid: dark ? CHART_GRID_DARK : CHART_GRID,
    axis: dark ? CHART_AXIS_DARK : CHART_AXIS,
    surface: dark ? CHART_SURFACE_DARK : CHART_SURFACE,
    cursor: dark ? CHART_CURSOR_DARK : CHART_CURSOR_LIGHT,
  };
}
