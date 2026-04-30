import type { Component, Ref } from "vue"
import { createContext } from "reka-ui"

// Components
export { default as ChartContainer } from "./ChartContainer.vue"
export { default as ChartCrosshair } from "./ChartCrosshair.vue"
export { default as ChartLegend } from "./ChartLegend.vue"
export { default as ChartLegendContent } from "./ChartLegendContent.vue"
export { default as ChartSingleTooltip } from "./ChartSingleTooltip.vue"
export { default as ChartStyle } from "./ChartStyle.vue"
export { default as ChartTooltip } from "./ChartTooltip.vue"
export { default as ChartTooltipContent } from "./ChartTooltipContent.vue"

// Utils
export { componentToString } from "./utils"

// 🎨 colores por defecto
export function defaultColors(count: number = 3) {
  const colors = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#ef4444",
    "#9333ea",
    "#06b6d4",
    "#84cc16",
    "#f97316"
  ]
  return colors.slice(0, count)
}

// Format: { THEME_NAME: CSS_SELECTOR }
export const THEMES = {
  light: "",
  dark: ".dark"
} as const

export type ChartConfig = {
  [k in string]: {
    label?: string | Component
    icon?: string | Component
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

interface ChartContextProps {
  id: string
  config: Ref<ChartConfig>
}

export const [useChart, provideChartContext] =
  createContext<ChartContextProps>("Chart")