import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSitesByOwner } from "@/lib/services/site-service";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe, Plus, MessageSquare, Settings, Code, FileText, Key } from "lucide-react";

export default async function SitesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const sites = await getSitesByOwner(session.user.id);

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Manage your registered sites"
        action={
          <Button asChild size="sm">
            <Link href="/dashboard/sites/new">
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add Site
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
            <Globe className="h-10 w-10 text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="font-semibold text-lg mb-1 text-balance">No sites yet</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm">
              Register your first site to start embedding the comment widget on
              your Astro, Hugo, or Next.js blog.
            </p>
            <Button asChild>
              <Link href="/dashboard/sites/new">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add your first site
              </Link>
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => (
                <Card key={site.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">
                            {site.name}
                          </CardTitle>
                          <CardDescription className="text-xs truncate">
                            {site.domain}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          site.autoApprove
                            ? "shrink-0 border-green-200 bg-green-500/10 text-green-700 dark:border-green-800 dark:text-green-400"
                            : "shrink-0 border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                        }
                      >
                        {site.autoApprove ? "Auto-approve" : "Moderated"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 pb-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {site._count.pages} page{site._count.pages !== 1 ? "s" : ""} with comments
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Key className="h-3.5 w-3.5 shrink-0 font-sans" aria-hidden="true" />
                      <span className="truncate">{site.siteKey.slice(0, 16)}…</span>
                    </div>
                  </CardContent>

                  <Separator />

                  <CardFooter className="pt-3 gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/dashboard/sites/${site.id}/comments`}>
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Comments
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
                            <Code className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Integration</TooltipContent>
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
                            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Settings</TooltipContent>
                    </Tooltip>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
