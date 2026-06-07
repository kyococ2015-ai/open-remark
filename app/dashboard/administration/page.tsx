import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent } from "@/components/ui/card"

export default function AdministrationPage() {
  return (
    <div>
      <PageHeader
        title="Administration"
        description="Platform-level controls"
      />
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Administration page coming soon.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
