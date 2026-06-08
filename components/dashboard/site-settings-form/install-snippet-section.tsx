import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InstallSnippet } from "@/components/dashboard/install-snippet"

type Props = {
  siteKey: string
}

export function InstallSnippetSection({ siteKey }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Install snippet</CardTitle>
        <CardDescription>
          Paste this into any page where you want comments to appear.{" "}
          <code className="text-xs">data-slug</code> is optional — if omitted,
          the widget uses the current page path automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InstallSnippet
          code={`<div\n  data-open-remark\n  data-site-key="${siteKey}"\n></div>\n<script async src="${process.env.NEXT_PUBLIC_APP_URL}/embed.js"></script>`}
          language="html"
        />
      </CardContent>
    </Card>
  )
}
