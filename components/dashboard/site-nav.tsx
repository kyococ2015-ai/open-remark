"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  RiDashboardLine,
  RiMessage2Line,
  RiCodeSSlashLine,
  RiSettingsLine,
  RiFileTextLine,
  RiMenuLine,
  RiArrowLeftLine,
} from "@remixicon/react"

type Page = {
  id: string
  slug: string
  _count: { comments: number }
}

type Props = {
  siteId: string
  siteName: string
  siteDomain: string
  pages: Page[]
}

const NAV_ITEMS = [
  { label: "Overview", href: "", icon: RiDashboardLine },
  { label: "Comments", href: "/comments", icon: RiMessage2Line },
  { label: "Install", href: "/install", icon: RiCodeSSlashLine },
  { label: "Settings", href: "/settings", icon: RiSettingsLine },
]

function NavContent({
  siteId,
  siteName,
  siteDomain,
  pages,
  onNavigate,
}: Props & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSlug = searchParams.get("slug")

  function isActive(href: string) {
    const full = `/dashboard/sites/${siteId}${href}`
    if (href === "") return pathname === full
    return pathname.startsWith(full)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Back + site identity */}
      <div className="flex flex-col gap-3 px-3 pt-4 pb-3">
        <Link
          href="/dashboard/sites"
          className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={onNavigate}
        >
          <RiArrowLeftLine className="size-3.5" />
          All sites
        </Link>
        <div className="px-1">
          <p className="truncate text-sm leading-tight font-semibold">
            {siteName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{siteDomain}</p>
        </div>
      </div>

      <Separator />

      {/* Primary nav */}
      <nav
        className="flex flex-col gap-0.5 px-2 py-3"
        aria-label="Site navigation"
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={`/dashboard/sites/${siteId}${href}`}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <Icon
                className={`size-4 shrink-0 ${active ? "text-primary" : ""}`}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Pages explorer */}
      {pages.length > 0 && (
        <>
          <Separator />
          <div className="px-3 py-2.5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Pages
            </p>
          </div>
          <ScrollArea className="flex-1 px-2">
            <div className="flex flex-col gap-0.5 pb-4">
              {pages.map((p) => {
                const isPageActive =
                  pathname.startsWith(`/dashboard/sites/${siteId}/comments`) &&
                  activeSlug === p.slug
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/sites/${siteId}/comments?slug=${encodeURIComponent(p.slug)}`}
                    onClick={onNavigate}
                    className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                      isPageActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                    title={p.slug}
                  >
                    <RiFileTextLine className="size-3.5 shrink-0 opacity-60" />
                    <span className="flex-1 truncate text-xs leading-tight">
                      {p.slug}
                    </span>
                    {p._count.comments > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-4 min-w-4 px-1 text-xs leading-none"
                      >
                        {p._count.comments}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}

export function SiteNav(props: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile: hamburger strip */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 py-2 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Open navigation"
            >
              <RiMenuLine className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent {...props} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="truncate text-sm font-medium">{props.siteName}</span>
      </div>

      {/* Desktop: persistent sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-background md:flex">
        <NavContent {...props} />
      </aside>
    </>
  )
}
