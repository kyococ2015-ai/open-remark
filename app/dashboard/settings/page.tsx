import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Account and app preferences" />
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Settings page coming soon.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
