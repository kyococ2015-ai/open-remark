"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SiteLogo } from "@/components/ui/site-logo"
import {
  RiArrowRightSLine,
  RiDashboardLine,
  RiMessage2Line,
  RiUserLine,
  RiCodeSSlashLine,
  RiSettingsLine,
} from "@remixicon/react"

type Props = {
  siteId: string
  siteName: string
  siteDomain: string
}

const TABS = [
  { label: "Overview", href: "", icon: RiDashboardLine },
  { label: "Comments", href: "/comments", icon: RiMessage2Line },
  { label: "Users", href: "/users", icon: RiUserLine },
  { label: "Install", href: "/install", icon: RiCodeSSlashLine },
  { label: "Settings", href: "/settings", icon: RiSettingsLine },
]

export function SiteSubNav({ siteId, siteName, siteDomain }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    const full = `/dashboard/sites/${siteId}${href}`
    if (href === "") return pathname === full
    return pathname.startsWith(full)
  }

  return (
    <div className="sticky top-0 z-20 border-b bg-background">
      {/* Row 1 — breadcrumb */}
      <div className="flex h-12 items-center gap-1.5 px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />

        {/* breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1 text-sm"
        >
          <Link
            href="/dashboard/sites"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            Sites
          </Link>
          <RiArrowRightSLine
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <SiteLogo
            domain={siteDomain}
            size={16}
            className="shrink-0 rounded-sm"
          />
          <span className="truncate font-semibold">{siteName}</span>
          <span className="hidden shrink-0 text-muted-foreground sm:inline">
            ·
          </span>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            {siteDomain}
          </span>
        </nav>
      </div>

      {/* Row 2 — tabs */}
      <div className="scrollbar-none overflow-x-auto">
        <nav
          aria-label="Site sections"
          className="flex min-w-max items-end gap-0 px-4"
        >
          {TABS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={`/dashboard/sites/${siteId}${href}`}
                className={`relative flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                } `}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
