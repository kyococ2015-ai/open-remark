import { db } from "@/lib/db";
import { ApiError } from "@/lib/api/error";
import { CommentStatus } from "@/generated/prisma/client";

export async function moderateComment(
  commentId: string,
  status: CommentStatus,
  adminEmail: string,
) {
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new ApiError("Comment not found", 404);

  const [updated] = await db.$transaction([
    db.comment.update({
      where: { id: commentId },
      data: { status },
    }),
    db.moderationLog.create({
      data: { commentId, action: status, adminEmail },
    }),
  ]);

  return updated;
}

export async function bulkModerate(
  commentIds: string[],
  status: CommentStatus,
  adminEmail: string,
) {
  await db.$transaction([
    db.comment.updateMany({
      where: { id: { in: commentIds } },
      data: { status },
    }),
    ...commentIds.map((commentId) =>
      db.moderationLog.create({
        data: { commentId, action: status, adminEmail },
      }),
    ),
  ]);
}

export async function getSiteCommentStats(siteId: string) {
  const [total, pending, approved, spam] = await Promise.all([
    db.comment.count({ where: { page: { siteId } } }),
    db.comment.count({ where: { page: { siteId }, status: CommentStatus.PENDING } }),
    db.comment.count({ where: { page: { siteId }, status: CommentStatus.APPROVED } }),
    db.comment.count({ where: { page: { siteId }, status: CommentStatus.SPAM } }),
  ]);
  return { total, pending, approved, spam };
}

export async function getOwnerOverview(ownerId: string) {
  const sites = await db.site.findMany({
    where: { ownerId },
    include: {
      _count: { select: { pages: true } },
      pages: {
        include: {
          _count: { select: { comments: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const siteIds = sites.map((s) => s.id);

  const [totalComments, pendingComments, approvedComments, spamComments, recentComments] =
    await Promise.all([
      db.comment.count({ where: { page: { siteId: { in: siteIds } } } }),
      db.comment.count({
        where: { page: { siteId: { in: siteIds } }, status: CommentStatus.PENDING },
      }),
      db.comment.count({
        where: { page: { siteId: { in: siteIds } }, status: CommentStatus.APPROVED },
      }),
      db.comment.count({
        where: { page: { siteId: { in: siteIds } }, status: CommentStatus.SPAM },
      }),
      db.comment.findMany({
        where: { page: { siteId: { in: siteIds } } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          page: { select: { slug: true, site: { select: { name: true, id: true } } } },
          commenter: { select: { name: true } },
        },
      }),
    ]);

  return {
    totalSites: sites.length,
    totalComments,
    pendingComments,
    approvedComments,
    spamComments,
    sites,
    recentComments,
  };
}
