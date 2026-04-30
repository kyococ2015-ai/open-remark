"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  RiDashboardLine,
  RiMessage2Line,
  RiCodeSSlashLine,
  RiSettingsLine,
  RiFileTextLine,
  RiMenuLine,
  RiArrowLeftLine,
} from "@remixicon/react";

type Page = {
  id: string;
  slug: string;
  _count: { comments: number };
};

type Props = {
  siteId: string;
  siteName: string;
  siteDomain: string;
  pages: Page[];
};

const NAV_ITEMS = [
  { label: "Overview", href: "", icon: RiDashboardLine },
  { label: "Comments", href: "/comments", icon: RiMessage2Line },
  { label: "Install", href: "/install", icon: RiCodeSSlashLine },
  { label: "Settings", href: "/settings", icon: RiSettingsLine },
];

function NavContent({ siteId, siteName, siteDomain, pages, onNavigate }: Props & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get("slug");

  function isActive(href: string) {
    const full = `/dashboard/sites/${siteId}${href}`;
    if (href === "") return pathname === full;
    return pathname.startsWith(full);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Back + site identity */}
      <div className="px-3 pt-4 pb-3 space-y-3">
        <Link
          href="/dashboard/sites"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          onClick={onNavigate}
        >
          <RiArrowLeftLine className="size-3.5" />
          All sites
        </Link>
        <div className="px-1">
          <p className="font-semibold text-sm leading-tight truncate">{siteName}</p>
          <p className="text-xs text-muted-foreground truncate">{siteDomain}</p>
        </div>
      </div>

      <Separator />

      {/* Primary nav */}
      <nav className="px-2 py-3 space-y-0.5" aria-label="Site navigation">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`/dashboard/sites/${siteId}${href}`}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Pages explorer */}
      {pages.length > 0 && (
        <>
          <Separator />
          <div className="px-3 py-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pages
            </p>
          </div>
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-0.5 pb-4">
              {pages.map((p) => {
                const isPageActive =
                  pathname.startsWith(`/dashboard/sites/${siteId}/comments`) &&
                  activeSlug === p.slug;
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/sites/${siteId}/comments?slug=${encodeURIComponent(p.slug)}`}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors group ${
                      isPageActive
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    title={p.slug}
                  >
                    <RiFileTextLine className="size-3.5 shrink-0 opacity-60" />
                    <span className="flex-1 truncate text-xs leading-tight">{p.slug}</span>
                    {p._count.comments > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-4 min-w-4 px-1 text-[10px] leading-none"
                      >
                        {p._count.comments}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

export function SiteNav(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: hamburger strip */}
      <div className="md:hidden flex items-center gap-2 border-b px-4 py-2 bg-background sticky top-0 z-10">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open navigation">
              <RiMenuLine className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent {...props} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium truncate">{props.siteName}</span>
      </div>

      {/* Desktop: persistent sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-background">
        <NavContent {...props} />
      </aside>
    </>
  );
}
