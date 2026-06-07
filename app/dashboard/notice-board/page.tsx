import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent } from "@/components/ui/card"

export default function NoticeBoardPage() {
  return (
    <div>
      <PageHeader
        title="Notice Board"
        description="Announcements and updates"
      />
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Notice board coming soon.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
