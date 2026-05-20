"use client"

import { Area, AreaChart, YAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

type Props = { data: number[]; id: string }

const chartConfig: ChartConfig = {
  count: { label: "Comments", color: "var(--chart-1)" },
}

export function SiteSparkline({ data, id }: Props) {
  const formatted = data.map((count, i) => ({ i, count }))
  const gradId = `sg-${id}`

  return (
    <ChartContainer config={chartConfig} className="h-12 w-full">
      <AreaChart
        data={formatted}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={[-0.5, (max: number) => Math.max(max, 1)]} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill={`url(#${gradId})`}
          baseValue={-0.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
