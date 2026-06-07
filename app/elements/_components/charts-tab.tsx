import { MessageSquare, Users, CheckCircle } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { SiteSparkline } from "@/components/dashboard/site-sparkline"
import { CommentActivityChart } from "@/components/dashboard/comment-activity-chart"
import { CommentStatusChart } from "@/components/dashboard/comment-status-chart"

function Block({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border p-5">
      <p className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  )
}

const sparklineData = [
  4, 7, 5, 9, 6, 11, 8, 14, 10, 13, 9, 16, 12, 18, 15, 20, 17, 22, 19, 24, 21,
  18, 23, 20, 25, 22, 27, 24, 28, 30,
]

const activityData = [
  { date: "2026-05-25", count: 12 },
  { date: "2026-05-26", count: 19 },
  { date: "2026-05-27", count: 8 },
  { date: "2026-05-28", count: 24 },
  { date: "2026-05-29", count: 31 },
  { date: "2026-05-30", count: 17 },
  { date: "2026-05-31", count: 22 },
  { date: "2026-06-01", count: 35 },
  { date: "2026-06-02", count: 28 },
  { date: "2026-06-03", count: 14 },
  { date: "2026-06-04", count: 40 },
  { date: "2026-06-05", count: 33 },
  { date: "2026-06-06", count: 27 },
  { date: "2026-06-07", count: 38 },
]

export function ChartsTab() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Block label="StatCard">
        <div className="flex flex-col gap-6">
          <StatCard
            title="Total Comments"
            value="1,284"
            icon={MessageSquare}
            description="+12% from last month"
          />
          <StatCard
            title="Active Users"
            value="348"
            icon={Users}
            description="Unique commenters"
            variant="success"
          />
          <StatCard
            title="Spam Blocked"
            value="27"
            icon={CheckCircle}
            description="Auto-moderated"
            variant="destructive"
          />
        </div>
      </Block>

      <Block label="SiteSparkline">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">my-blog.com</p>
          <SiteSparkline data={sparklineData} id="elements-preview" />
        </div>
      </Block>

      <Block label="CommentActivityChart">
        <CommentActivityChart data={activityData} />
      </Block>

      <Block label="CommentStatusChart">
        <CommentStatusChart approved={842} pending={67} spam={27} />
      </Block>
    </div>
  )
}
