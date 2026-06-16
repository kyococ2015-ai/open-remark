import { cache } from "react"
import { db } from "@/lib/db"
import { ApiError } from "@/lib/api/error"
import { requireSiteAccess } from "@/lib/services/membership-service"

export const getPagesForSite = cache(async (siteId: string) => {
  return db.page.findMany({
    where: { siteId },
    include: { _count: { select: { comments: true } } },
    orderBy: { createdAt: "desc" },
  })
})

export async function deletePage(
  siteId: string,
  pageId: string,
  userId: string
) {
  await requireSiteAccess(siteId, userId, "MANAGE_SETTINGS")
  const page = await db.page.findFirst({ where: { id: pageId, siteId } })
  if (!page) throw new ApiError("Page not found", 404)
  await db.page.delete({ where: { id: pageId } })
}
