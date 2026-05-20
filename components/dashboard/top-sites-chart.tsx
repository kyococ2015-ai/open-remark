"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type Site = {
  name: string
  comments: number
}

type Props = {
  sites: Site[]
}

const chartConfig: ChartConfig = {
  comments: {
    label: "Comments",
    color: "var(--chart-2)",
  },
}

export function TopSitesChart({ sites }: Props) {
  if (sites.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No sites yet.</p>
  }

  const data = sites.map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 14) + "…" : s.name,
    comments: s.comments,
  }))

  return (
    <ChartContainer config={chartConfig} className="h-40 w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="comments" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
