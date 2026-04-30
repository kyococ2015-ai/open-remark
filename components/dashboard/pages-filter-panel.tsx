"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RiFileTextLine, RiLayoutLeftLine, RiCloseLine } from "@remixicon/react";

type Page = { id: string; slug: string; count: number };

type Props = {
  siteId: string;
  pages: Page[];
  activeSlug?: string;
  activeStatus?: string;
};

export function PagesFilterPanel({ siteId, pages, activeSlug, activeStatus }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  function pageHref(slug: string | null) {
    const base = `/dashboard/sites/${siteId}/comments`;
    const params = new URLSearchParams();
    if (activeStatus && activeStatus !== "ALL") params.set("status", activeStatus);
    if (slug) params.set("slug", slug);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  if (collapsed) {
    return (
      <div className="border-r flex flex-col items-center pt-3 px-1.5 gap-2 w-10 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed(false)}
          aria-label="Show pages panel"
        >
          <RiLayoutLeftLine className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="border-r flex flex-col w-52 shrink-0 bg-background">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Pages
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-1"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse pages panel"
        >
          <RiCloseLine className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {/* All pages */}
          <Link
            href={pageHref(null)}
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              !activeSlug
                ? "bg-accent text-foreground font-medium"
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
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors group ${
                activeSlug === p.slug
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <RiFileTextLine className="size-3.5 shrink-0 opacity-50" />
              <span className="flex-1 text-xs leading-snug truncate">{p.slug}</span>
              {p.count > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-[1rem] px-1 text-[10px] leading-none shrink-0"
                >
                  {p.count}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
