"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-hidden",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-sector]:outline-hidden",
          "[&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, itemConfig]) => itemConfig.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => `  --color-${key}: ${itemConfig.color};`)
  .join("\n")}
}
`,
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  label,
  labelFormatter,
  formatter,
}: {
  active?: boolean
  payload?: Array<{
    color?: string
    dataKey?: string | number
    name?: string | number
    value?: string | number | null
    payload?: Record<string, unknown>
  }>
  className?: string
  label?: React.ReactNode
  labelFormatter?: (label: React.ReactNode, payload: Array<{
    color?: string
    dataKey?: string | number
    name?: string | number
    value?: string | number | null
    payload?: Record<string, unknown>
  }>) => React.ReactNode
  formatter?: (
    value: string | number | null | undefined,
    name: string | number | undefined,
    item: {
      color?: string
      dataKey?: string | number
      name?: string | number
      value?: string | number | null
      payload?: Record<string, unknown>
    },
    payload: Array<{
      color?: string
      dataKey?: string | number
      name?: string | number
      value?: string | number | null
      payload?: Record<string, unknown>
    }>,
    itemPayload?: Record<string, unknown>,
  ) => React.ReactNode
  hideLabel?: boolean
  indicator?: "line" | "dot"
}) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  const tooltipLabel = labelFormatter
    ? labelFormatter(label, payload)
    : label

  return (
    <div
      className={cn(
        "grid min-w-[8rem] gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl",
        className,
      )}
    >
      {!hideLabel && tooltipLabel ? (
        <div className="font-medium text-foreground">{tooltipLabel}</div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? "")
          const itemConfig = config[key]
          const itemColor = typeof item.color === "string"
            ? item.color
            : typeof item.payload?.fill === "string"
              ? item.payload.fill
              : `var(--color-${key})`

          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span
                  className={cn(
                    "shrink-0 rounded-[2px]",
                    indicator === "dot" ? "size-2" : "h-0.5 w-3",
                  )}
                  style={{ backgroundColor: itemColor }}
                />
                <span>{itemConfig?.label ?? item.name}</span>
              </div>
              <span className="font-medium text-foreground">
                {formatter
                  ? formatter(item.value, item.name, item, payload, item.payload)
                  : item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
