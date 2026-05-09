import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/error";
import { sanitizeBody } from "@/lib/sanitize";
import { CommentStatus } from "@/generated/prisma/client";
import type { CreateCommentInput } from "@/lib/validators/comment";

function buildCommenterSelect() {
  return {
    id: true,
    name: true,
    username: true,
    image: true,
  };
}

function buildCommentSelect(userEmail?: string) {
  const likeWhere = userEmail ? { where: { userEmail } } : undefined;
  return {
    id: true,
    body: true,
    status: true,
    createdAt: true,
    commenter: { select: buildCommenterSelect() },
    _count: { select: { likes: true } },
    likes: likeWhere ? { ...likeWhere, select: { id: true } } : undefined,
    replies: {
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        commenter: { select: buildCommenterSelect() },
        _count: { select: { likes: true } },
        likes: likeWhere ? { ...likeWhere, select: { id: true } } : undefined,
      },
      orderBy: { createdAt: "asc" as const },
    },
  };
}

export async function getCommentsBySite(
  siteId: string,
  filters: { status?: CommentStatus; slug?: string; page?: number; limit?: number } = {},
) {
  const { status, slug, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: {
        page: { siteId, ...(slug && { slug }) },
        ...(status && { status }),
      },
      include: {
        page: { select: { slug: true, url: true } },
        commenter: { select: buildCommenterSelect() },
        replies: {
          where: { status: CommentStatus.APPROVED },
          orderBy: { createdAt: "asc" },
          include: { commenter: { select: buildCommenterSelect() } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.comment.count({
      where: { page: { siteId, ...(slug && { slug }) }, ...(status && { status }) },
    }),
  ]);

  return { comments, total, page, limit };
}

export async function getApprovedCommentsForPage(siteId: string, slug: string, userEmail?: string) {
  const page = await prisma.page.findUnique({
    where: { siteId_slug: { siteId, slug } },
  });
  if (!page) return [];

  const raw = await prisma.comment.findMany({
    where: {
      pageId: page.id,
      status: "APPROVED",
      parentId: null,
    },
    select: buildCommentSelect(userEmail),
    orderBy: { createdAt: "desc" },
  });

  return raw.map((c) => ({
    id: c.id,
    body: c.body,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    likeCount: c._count.likes,
    hasLiked: userEmail ? c.likes.length > 0 : false,
    commenter: c.commenter,
    replies: c.replies.map((r) => ({
      id: r.id,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      likeCount: r._count.likes,
      hasLiked: userEmail ? r.likes.length > 0 : false,
      commenter: r.commenter,
      replies: [],
    })),
  }));
}

export async function createComment(
  data: CreateCommentInput,
  commenterId: string,
  autoApprove: boolean,
) {
  const sanitized = sanitizeBody(data.body);
  if (!sanitized) throw new ApiError("Comment body is empty", 400);

  const site = await prisma.site.findUniqueOrThrow({
    where: { siteKey: data.siteKey },
    select: { id: true },
  });

  const page = await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: data.slug } },
    update: {},
    create: { siteId: site.id, slug: data.slug, url: data.url },
  });

  const raw = await prisma.comment.create({
    data: {
      body: sanitized,
      pageId: page.id,
      parentId: data.parentId ?? null,
      commenterId,
      status: autoApprove ? "APPROVED" : "PENDING",
    },
    select: buildCommentSelect(),
  });

  return {
    id: raw.id,
    body: raw.body,
    status: raw.status,
    createdAt: raw.createdAt.toISOString(),
    likeCount: 0,
    hasLiked: false,
    commenter: raw.commenter,
    replies: [],
  };
}

export async function toggleCommentLike(commentId: string, userEmail: string) {
  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userEmail: { commentId, userEmail } },
  });

  if (existing) {
    await prisma.commentLike.delete({
      where: { id: existing.id },
    });
    const count = await prisma.commentLike.count({ where: { commentId } });
    return { liked: false, count };
  }

  await prisma.commentLike.create({
    data: { commentId, userEmail },
  });
  const count = await prisma.commentLike.count({ where: { commentId } });
  return { liked: true, count };
}
