"use client"

import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { RiFileTextLine, RiLayoutLeftLine, RiCloseLine } from "@remixicon/react"

type Page = { id: string; slug: string; count: number }

type Props = {
  siteId: string
  pages: Page[]
  activeSlug?: string
  activeStatus?: string
  search?: string
}

export function PagesFilterPanel({
  siteId,
  pages,
  activeSlug,
  activeStatus,
  search,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)

  function pageHref(slug: string | null) {
    const base = `/dashboard/sites/${siteId}/comments`
    const params = new URLSearchParams()
    if (activeStatus && activeStatus !== "ALL")
      params.set("status", activeStatus)
    if (slug) params.set("slug", slug)
    if (search) params.set("search", search)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center gap-2 border-r px-1.5 pt-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setCollapsed(false)}
          aria-label="Show pages panel"
        >
          <RiLayoutLeftLine className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex w-52 shrink-0 flex-col border-r bg-background">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Pages
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-1 size-6"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse pages panel"
        >
          <RiCloseLine className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-1.5">
          {/* All pages */}
          <Link
            href={pageHref(null)}
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              !activeSlug
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span className="flex-1 text-xs">All pages</span>
          </Link>

          <Separator className="my-1" />

          {pages.map((p) => (
            <Link
              key={p.id}
              href={pageHref(p.slug)}
              title={p.slug}
              className={`group flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors ${
                activeSlug === p.slug
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <RiFileTextLine className="size-3.5 shrink-0 opacity-50" />
              <span className="flex-1 truncate text-xs leading-snug">
                {p.slug}
              </span>
              {p.count > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-4 shrink-0 px-1 text-xs leading-none"
                >
                  {p.count}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
