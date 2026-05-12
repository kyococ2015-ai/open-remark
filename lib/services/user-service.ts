import { db } from '@/lib/db';
import { ApiError } from '@/lib/api/error';
import { CommentStatus } from '@/generated/prisma/client';

export async function getCommentersBySite(
  siteId: string,
  filters: { page?: number; limit?: number; search?: string } = {},
) {
  const { page = 1, limit = 20, search } = filters;
  const skip = (page - 1) * limit;

  const searchFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { username: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : undefined;

  const where = {
    ...(searchFilter || {}),
    comments: {
      some: { page: { siteId } },
    },
  };

  const [commentersData, total] = await Promise.all([
    db.commenter.findMany({
      where,
      include: {
        comments: {
          where: { page: { siteId } },
          select: { status: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    db.commenter.count({ where }),
  ]);

  const commenterIds = commentersData.map((c) => c.id);

  const bannedRecords = await db.bannedCommenter.findMany({
    where: {
      siteId,
      commenterId: { in: commenterIds },
    },
    select: { commenterId: true },
  });
  const bannedSet = new Set(bannedRecords.map((b) => b.commenterId));

  const commenters = commentersData.map((commenter) => {
    const totalCount = commenter.comments.length;
    const deletedCount = commenter.comments.filter(
      (c) => c.status === CommentStatus.DELETED,
    ).length;
    const spamCount = commenter.comments.filter(
      (c) => c.status === CommentStatus.SPAM,
    ).length;

    return {
      id: commenter.id,
      name: commenter.name,
      email: commenter.email,
      image: commenter.image,
      username: commenter.username,
      totalCount,
      deletedCount,
      spamCount,
      isBanned: bannedSet.has(commenter.id),
    };
  });

  return { commenters, total, page, limit };
}

export async function getCommentsByCommenterOnSite(siteId: string, commenterId: string) {
  const comments = await db.comment.findMany({
    where: {
      page: { siteId },
      commenterId,
    },
    include: {
      page: { select: { slug: true, url: true } },
      commenter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return comments;
}

export async function deleteAllCommentsByCommenterOnSite(
  siteId: string,
  commenterId: string,
  adminEmail: string,
) {
  const commentsToDelete = await db.comment.findMany({
    where: {
      page: { siteId },
      commenterId,
      status: { not: CommentStatus.DELETED },
    },
    select: { id: true },
  });

  if (commentsToDelete.length === 0) {
    return { deletedCount: 0 };
  }

  const commentIds = commentsToDelete.map((c) => c.id);

  await db.$transaction([
    db.comment.updateMany({
      where: { id: { in: commentIds } },
      data: { status: CommentStatus.DELETED },
    }),
    ...commentIds.map((commentId) =>
      db.moderationLog.create({
        data: { commentId, action: 'DELETED', adminEmail },
      }),
    ),
  ]);

  return { deletedCount: commentsToDelete.length };
}

export async function banCommenterOnSite(
  siteId: string,
  commenterId: string,
) {
  const existing = await db.bannedCommenter.findUnique({
    where: { siteId_commenterId: { siteId, commenterId } },
  });

  if (existing) {
    throw new ApiError('User is already banned on this site', 409);
  }

  await db.bannedCommenter.create({
    data: { siteId, commenterId },
  });

  return { banned: true };
}

export async function unbanCommenterOnSite(siteId: string, commenterId: string) {
  await db.bannedCommenter.delete({
    where: { siteId_commenterId: { siteId, commenterId } },
  });

  return { unbanned: true };
}

export async function isCommenterBannedOnSite(
  siteId: string,
  commenterId: string,
): Promise<boolean> {
  const record = await db.bannedCommenter.findUnique({
    where: { siteId_commenterId: { siteId, commenterId } },
  });
  return !!record;
}
