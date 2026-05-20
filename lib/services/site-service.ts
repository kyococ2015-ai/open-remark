import { db } from "@/lib/db"
import { ApiError } from "@/lib/api/error"
import { CommentStatus } from "@/generated/prisma/client"
import type { CreateSiteInput, UpdateSiteInput } from "@/lib/validators/site"

export async function getSitesByOwner(ownerId: string) {
  const [sites, pendingByPage] = await Promise.all([
    db.site.findMany({
      where: { ownerId },
      include: {
        _count: { select: { pages: true } },
        pages: {
          select: { id: true, _count: { select: { comments: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.comment.groupBy({
      by: ["pageId"],
      where: { status: CommentStatus.PENDING, page: { site: { ownerId } } },
      _count: { _all: true },
    }),
  ])

  const pendingByPageId = new Map(
    pendingByPage.map((r) => [r.pageId, r._count._all])
  )

  return sites.map((site) => ({
    ...site,
    totalComments: site.pages.reduce((acc, p) => acc + p._count.comments, 0),
    pendingComments: site.pages.reduce(
      (acc, p) => acc + (pendingByPageId.get(p.id) ?? 0),
      0
    ),
  }))
}

export async function getSiteByIdForOwner(siteId: string, ownerId: string) {
  const site = await db.site.findFirst({ where: { id: siteId, ownerId } })
  if (!site) throw new ApiError("Site not found", 404)
  return site
}

export async function getSiteBySiteKey(siteKey: string) {
  const site = await db.site.findUnique({ where: { siteKey } })
  if (!site) throw new ApiError("Site not found", 404)
  return site
}

export async function createSite(ownerId: string, input: CreateSiteInput) {
  return db.site.create({
    data: {
      name: input.name,
      domain: input.domain,
      autoApprove: input.autoApprove,
      allowedOrigins: JSON.stringify(input.allowedOrigins),
      theme: input.theme,
      primaryColor: input.primaryColor,
      radius: input.radius,
      ownerId,
    },
  })
}

export async function updateSite(
  siteId: string,
  ownerId: string,
  input: UpdateSiteInput
) {
  await getSiteByIdForOwner(siteId, ownerId)
  return db.site.update({
    where: { id: siteId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.domain && { domain: input.domain }),
      ...(typeof input.autoApprove === "boolean" && {
        autoApprove: input.autoApprove,
      }),
      ...(input.allowedOrigins && {
        allowedOrigins: JSON.stringify(input.allowedOrigins),
      }),
      ...(input.theme && { theme: input.theme }),
      ...(input.primaryColor && { primaryColor: input.primaryColor }),
      ...(typeof input.radius === "number" && { radius: input.radius }),
    },
  })
}

export async function deleteSite(siteId: string, ownerId: string) {
  await getSiteByIdForOwner(siteId, ownerId)
  await db.site.delete({ where: { id: siteId } })
}
