import Link from "next/link"
import { auth } from "@/lib/auth"
import { getSitesByOwner } from "@/lib/services/site-service"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  RiAddLine,
  RiGlobalLine,
  RiMessage2Line,
  RiSettings3Line,
  RiCodeLine,
  RiTimeLine,
  RiFileList2Line,
} from "@remixicon/react"

export default async function SitesPage() {
  const session = await auth()
  const sites = await getSitesByOwner(session!.user!.id as string)

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Manage your registered sites"
        action={
          <Button asChild size="sm">
            <Link href="/dashboard/sites/new">
              <RiAddLine className="size-4" aria-hidden="true" />
              Add Site
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed py-20 text-center">
            <RiGlobalLine
              className="mb-4 size-10 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mb-1 text-lg font-semibold text-balance">
              No sites yet
            </h3>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              Register your first site to start embedding the comment widget on
              your Astro, Hugo, or Next.js blog.
            </p>
            <Button asChild>
              <Link href="/dashboard/sites/new">
                <RiAddLine className="size-4" aria-hidden="true" />
                Add your first site
              </Link>
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="flex flex-col border bg-card transition-shadow hover:shadow-sm"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <div className="flex size-10 shrink-0 items-center justify-center bg-primary/10 text-sm font-bold text-primary">
                      {site.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-tight font-semibold">
                        {site.name}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <RiGlobalLine
                          className="size-3 shrink-0"
                          aria-hidden="true"
                        />
                        {site.domain}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        site.autoApprove
                          ? "border-success/30 bg-success/10 text-success shrink-0 px-1.5 py-0 text-[10px]"
                          : "border-warning/30 bg-warning/10 text-warning shrink-0 px-1.5 py-0 text-[10px]"
                      }
                    >
                      {site.autoApprove ? "Auto-approve" : "Moderated"}
                    </Badge>
                  </div>

                  {/* Stats strip */}
                  <div className="mx-4 mb-4 grid grid-cols-3 bg-muted/50">
                    <div className="flex flex-col items-center py-2.5">
                      <span className="text-base leading-tight font-semibold tabular-nums">
                        {site.totalComments}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <RiMessage2Line className="size-3" aria-hidden="true" />
                        Comments
                      </span>
                    </div>
                    <div className="flex flex-col items-center py-2.5">
                      <span
                        className={`text-base leading-tight font-semibold tabular-nums ${
                          site.pendingComments > 0 ? "text-warning" : ""
                        }`}
                      >
                        {site.pendingComments}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <RiTimeLine className="size-3" aria-hidden="true" />
                        Pending
                      </span>
                    </div>
                    <div className="flex flex-col items-center py-2.5">
                      <span className="text-base leading-tight font-semibold tabular-nums">
                        {site._count.pages}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <RiFileList2Line
                          className="size-3"
                          aria-hidden="true"
                        />
                        Pages
                      </span>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center gap-2 p-3">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link href={`/dashboard/sites/${site.id}/comments`}>
                        <RiMessage2Line
                          className="size-3.5"
                          aria-hidden="true"
                        />
                        Comments
                        {site.pendingComments > 0 && (
                          <span className="bg-warning text-warning-foreground ml-auto flex size-4 items-center justify-center text-[10px] font-semibold tabular-nums">
                            {site.pendingComments}
                          </span>
                        )}
                      </Link>
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          aria-label={`Integration steps for ${site.name}`}
                        >
                          <Link href={`/dashboard/sites/${site.id}/install`}>
                            <RiCodeLine
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Install widget</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          aria-label={`Settings for ${site.name}`}
                        >
                          <Link href={`/dashboard/sites/${site.id}/settings`}>
                            <RiSettings3Line
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Settings</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
