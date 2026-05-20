"use client"

import { Cell, Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type Props = {
  approved: number
  pending: number
  spam: number
}

const chartConfig: ChartConfig = {
  approved: { label: "Approved", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-3)" },
  spam: { label: "Spam", color: "var(--chart-4)" },
}

export function CommentStatusChart({ approved, pending, spam }: Props) {
  const data = [
    { name: "approved", label: "Approved", value: approved },
    { name: "pending", label: "Pending", value: pending },
    { name: "spam", label: "Spam", value: spam },
  ].filter((d) => d.value > 0)

  const total = approved + pending + spam

  return (
    <div className="flex items-center gap-6">
      <ChartContainer config={chartConfig} className="size-36 shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="80%"
            strokeWidth={0}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="flex min-w-0 flex-col gap-2.5 text-sm">
        {[
          { key: "approved", label: "Approved", value: approved },
          { key: "pending", label: "Pending", value: pending },
          { key: "spam", label: "Spam", value: spam },
        ].map(({ key, label, value }) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: `var(--color-${key})` }}
            />
            <span className="flex-1 text-xs text-muted-foreground">
              {label}
            </span>
            <span className="text-xs font-medium tabular-nums">
              {value}
              <span className="ml-1 text-muted-foreground">
                ({total > 0 ? Math.round((value / total) * 100) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
