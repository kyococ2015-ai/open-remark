import { db } from "@/lib/db"
import { ApiError } from "@/lib/api/error"
import { CommentStatus, Prisma } from "@/generated/prisma/client"

export async function moderateComment(
  commentId: string,
  status: CommentStatus,
  adminEmail: string
) {
  const comment = await db.comment.findUnique({ where: { id: commentId } })
  if (!comment) throw new ApiError("Comment not found", 404)

  const [updated] = await db.$transaction([
    db.comment.update({
      where: { id: commentId },
      data: { status },
    }),
    db.moderationLog.create({
      data: { commentId, action: status, adminEmail },
    }),
  ])

  return updated
}

export async function bulkModerate(
  commentIds: string[],
  status: CommentStatus,
  adminEmail: string
) {
  await db.$transaction([
    db.comment.updateMany({
      where: { id: { in: commentIds } },
      data: { status },
    }),
    ...commentIds.map((commentId) =>
      db.moderationLog.create({
        data: { commentId, action: status, adminEmail },
      })
    ),
  ])
}

export async function getSiteCommentStats(siteId: string) {
  const [total, pending, approved, spam] = await Promise.all([
    db.comment.count({ where: { page: { siteId } } }),
    db.comment.count({
      where: { page: { siteId }, status: CommentStatus.PENDING },
    }),
    db.comment.count({
      where: { page: { siteId }, status: CommentStatus.APPROVED },
    }),
    db.comment.count({
      where: { page: { siteId }, status: CommentStatus.SPAM },
    }),
  ])
  return { total, pending, approved, spam }
}

type DailyCount = { date: string; count: number }

export async function getUserOverview(userId: string) {
  const allSites = await db.site.findMany({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { pages: true } },
      pages: {
        include: {
          _count: { select: { comments: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const siteIds = allSites.map((s) => s.id)

  const [
    totalComments,
    pendingComments,
    approvedComments,
    spamComments,
    recentComments,
    rawActivity,
  ] = await Promise.all([
    db.comment.count({ where: { page: { siteId: { in: siteIds } } } }),
    db.comment.count({
      where: {
        page: { siteId: { in: siteIds } },
        status: CommentStatus.PENDING,
      },
    }),
    db.comment.count({
      where: {
        page: { siteId: { in: siteIds } },
        status: CommentStatus.APPROVED,
      },
    }),
    db.comment.count({
      where: { page: { siteId: { in: siteIds } }, status: CommentStatus.SPAM },
    }),
    db.comment.findMany({
      where: { page: { siteId: { in: siteIds } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        page: {
          select: { slug: true, site: { select: { name: true, id: true } } },
        },
        commenter: { select: { name: true } },
      },
    }),
    siteIds.length > 0
      ? db.$queryRaw<Array<{ date: Date; count: bigint }>>`
          SELECT DATE_TRUNC('day', c."createdAt") AS date, COUNT(*) AS count
          FROM "Comment" c
          JOIN "Page" p ON c."pageId" = p.id
          WHERE p."siteId" IN (${Prisma.join(siteIds)})
            AND c."createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY date
          ORDER BY date ASC
        `
      : Promise.resolve([]),
  ])

  // Fill in zeros for all 30 days
  const activityMap = new Map<string, number>()
  for (const row of rawActivity) {
    const key = new Date(row.date).toISOString().slice(0, 10)
    activityMap.set(key, Number(row.count))
  }
  const commentActivity: DailyCount[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: activityMap.get(key) ?? 0 }
  })

  return {
    totalSites: allSites.length,
    totalComments,
    pendingComments,
    approvedComments,
    spamComments,
    sites: allSites.slice(0, 5),
    recentComments,
    commentActivity,
  }
}

export async function getSiteIdForComment(commentId: string): Promise<string> {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { page: { select: { siteId: true } } },
  })
  if (!comment) throw new ApiError("Comment not found", 404)
  return comment.page.siteId
}

export async function getSiteIdsForComments(ids: string[]): Promise<string[]> {
  const rows = await db.comment.findMany({
    where: { id: { in: ids } },
    select: { page: { select: { siteId: true } } },
  })
  return [...new Set(rows.map((r) => r.page.siteId))]
}
