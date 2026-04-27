import { db } from "@/lib/db";
import { ApiError } from "@/lib/api/error";
import { sanitizeBody } from "@/lib/sanitize";
import { CommentStatus } from "@/generated/prisma/client";
import type { CreateCommentInput } from "@/lib/validators/comment";

export async function getCommentsBySite(
  siteId: string,
  filters: { status?: CommentStatus; page?: number; limit?: number } = {},
) {
  const { status, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    db.comment.findMany({
      where: {
        page: { siteId },
        ...(status && { status }),
      },
      include: {
        page: { select: { slug: true, url: true } },
        replies: {
          where: { status: CommentStatus.APPROVED },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.comment.count({
      where: { page: { siteId }, ...(status && { status }) },
    }),
  ]);

  return { comments, total, page, limit };
}

export async function getApprovedCommentsForPage(siteId: string, slug: string) {
  const page = await db.page.findUnique({ where: { siteId_slug: { siteId, slug } } });
  if (!page) return [];

  return db.comment.findMany({
    where: { pageId: page.id, status: CommentStatus.APPROVED, parentId: null },
    include: {
      replies: {
        where: { status: CommentStatus.APPROVED },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createComment(
  input: CreateCommentInput,
  author: { email: string; name: string; image?: string },
  autoApprove: boolean,
) {
  const sanitized = sanitizeBody(input.body);
  if (!sanitized) throw new ApiError("Comment body is empty", 400);

  const page = await db.page.upsert({
    where: {
      siteId_slug: {
        siteId: (
          await db.site.findUniqueOrThrow({ where: { siteKey: input.siteKey }, select: { id: true } })
        ).id,
        slug: input.slug,
      },
    },
    update: {},
    create: {
      slug: input.slug,
      url: input.url,
      site: { connect: { siteKey: input.siteKey } },
    },
  });

  return db.comment.create({
    data: {
      body: sanitized,
      authorName: author.name,
      authorEmail: author.email,
      authorImage: author.image,
      status: autoApprove ? CommentStatus.APPROVED : CommentStatus.PENDING,
      pageId: page.id,
      parentId: input.parentId,
    },
  });
}
