import { cache } from "react"
import { db } from "@/lib/db"

export const getPagesForSite = cache(async (siteId: string) => {
  return db.page.findMany({
    where: { siteId },
    include: { _count: { select: { comments: true } } },
    orderBy: { createdAt: "desc" },
  })
})
