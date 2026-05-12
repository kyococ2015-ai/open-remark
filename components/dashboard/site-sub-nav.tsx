"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  RiArrowRightSLine,
  RiDashboardLine,
  RiMessage2Line,
  RiUserLine,
  RiCodeSSlashLine,
  RiSettingsLine,
} from "@remixicon/react";

type Props = {
  siteId: string;
  siteName: string;
  siteDomain: string;
};

const TABS = [
  { label: "Overview",  href: "",          icon: RiDashboardLine  },
  { label: "Comments",  href: "/comments", icon: RiMessage2Line   },
  { label: "Users",     href: "/users",    icon: RiUserLine       },
  { label: "Install",   href: "/install",  icon: RiCodeSSlashLine },
  { label: "Settings",  href: "/settings", icon: RiSettingsLine   },
];

export function SiteSubNav({ siteId, siteName, siteDomain }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    const full = `/dashboard/sites/${siteId}${href}`;
    if (href === "") return pathname === full;
    return pathname.startsWith(full);
  }

  return (
    <div className="sticky top-0 z-20 bg-background border-b">
      {/* Row 1 — breadcrumb */}
      <div className="flex h-12 items-center gap-1.5 px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mx-1 h-4" />

        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm min-w-0">
          <Link
            href="/dashboard/sites"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Sites
          </Link>
          <RiArrowRightSLine className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
          <span className="font-semibold truncate">{siteName}</span>
          <span className="text-muted-foreground hidden sm:inline shrink-0">·</span>
          <span className="text-muted-foreground text-xs truncate hidden sm:inline">
            {siteDomain}
          </span>
        </nav>
      </div>

      {/* Row 2 — tabs */}
      <div className="overflow-x-auto scrollbar-none">
        <nav
          aria-label="Site sections"
          className="flex items-end gap-0 px-4 min-w-max"
        >
          {TABS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={`/dashboard/sites/${siteId}${href}`}
                className={`
                  relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors
                  border-b-2 whitespace-nowrap
                  ${active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }
                `}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
