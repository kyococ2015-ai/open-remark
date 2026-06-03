import { db } from "@/lib/db"
import { ApiError } from "@/lib/api/error"
import { sanitizeBody } from "@/lib/sanitize"
import { CommentStatus } from "@/generated/prisma/client"
import type { CreateCommentInput } from "@/lib/validators/comment"
import { notifyNewComment, notifyReply } from "@/lib/email/email-service"

function buildCommenterSelect() {
  return {
    id: true,
    name: true,
    email: true,
    username: true,
    image: true,
  }
}

function buildCommentSelect(userEmail?: string, commenterId?: string) {
  const likeWhere = userEmail ? { where: { userEmail } } : undefined

  const replyWhere = commenterId
    ? {
        OR: [
          { status: { in: [CommentStatus.APPROVED, CommentStatus.DELETED] } },
          { status: CommentStatus.PENDING, commenterId },
        ],
      }
    : { status: { in: [CommentStatus.APPROVED, CommentStatus.DELETED] } }

  return {
    id: true,
    body: true,
    status: true,
    createdAt: true,
    editedAt: true,
    parentId: true,
    commenterId: true,
    commenter: { select: buildCommenterSelect() },
    _count: { select: { likes: true } },
    likes: likeWhere ? { ...likeWhere, select: { id: true } } : undefined,
    replies: {
      where: replyWhere,
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        editedAt: true,
        parentId: true,
        commenterId: true,
        commenter: { select: buildCommenterSelect() },
        _count: { select: { likes: true } },
        likes: likeWhere ? { ...likeWhere, select: { id: true } } : undefined,
      },
      orderBy: { createdAt: "asc" as const },
    },
  }
}

export async function getCommentsBySite(
  siteId: string,
  filters: {
    status?: CommentStatus
    slug?: string
    page?: number
    limit?: number
    search?: string
  } = {}
) {
  const { status, slug, page = 1, limit = 50, search } = filters
  const skip = (page - 1) * limit

  const searchFilter = search
    ? {
        OR: [
          { body: { contains: search, mode: "insensitive" as const } },
          {
            commenter: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
          {
            commenter: {
              email: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : undefined

  const [comments, total] = await Promise.all([
    db.comment.findMany({
      where: {
        page: { siteId, ...(slug && { slug }) },
        ...(status && { status }),
        ...(searchFilter && searchFilter),
      },
      include: {
        page: { select: { slug: true, url: true } },
        commenter: { select: buildCommenterSelect() },
        replies: {
          where: {
            status: { in: [CommentStatus.APPROVED, CommentStatus.DELETED] },
          },
          orderBy: { createdAt: "asc" as const },
          include: { commenter: { select: buildCommenterSelect() } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.comment.count({
      where: {
        page: { siteId, ...(slug && { slug }) },
        ...(status && { status }),
        ...(searchFilter && searchFilter),
      },
    }),
  ])

  return { comments, total, page, limit }
}

export async function getApprovedCommentsForPage(
  siteId: string,
  slug: string,
  userEmail?: string,
  commenterId?: string
) {
  const page = await db.page.findUnique({
    where: { siteId_slug: { siteId, slug } },
  })
  if (!page) return []

  const select = buildCommentSelect(userEmail, commenterId)

  const [approvedRaw, pendingRaw] = await Promise.all([
    db.comment.findMany({
      where: {
        pageId: page.id,
        status: { in: [CommentStatus.APPROVED, CommentStatus.DELETED] },
        parentId: null,
      },
      select,
      orderBy: { createdAt: "desc" },
    }),
    commenterId
      ? db.comment.findMany({
          where: {
            pageId: page.id,
            status: CommentStatus.PENDING,
            parentId: null,
            commenterId,
          },
          select,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ])

  const raw = [...approvedRaw, ...pendingRaw].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )

  // Collect commenterIds of deleted comments to check ban status
  const deletedCommenterIds = [
    ...new Set(
      raw
        .filter((c) => c.status === CommentStatus.DELETED)
        .map((c) => c.commenterId)
    ),
  ]

  const bannedRecords =
    deletedCommenterIds.length > 0
      ? await db.bannedCommenter.findMany({
          where: {
            siteId,
            commenterId: { in: deletedCommenterIds },
          },
          select: { commenterId: true },
        })
      : []
  const bannedSet = new Set(bannedRecords.map((b) => b.commenterId))

  return raw.map((c) => ({
    id: c.id,
    body: c.body,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    editedAt: c.editedAt?.toISOString() ?? null,
    likeCount: c._count.likes,
    hasLiked: userEmail ? c.likes.length > 0 : false,
    parentId: c.parentId,
    commenter: c.commenter,
    banned:
      c.status === CommentStatus.DELETED
        ? bannedSet.has(c.commenterId)
        : undefined,
    replies: c.replies.map((r) => ({
      id: r.id,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      editedAt: r.editedAt?.toISOString() ?? null,
      likeCount: r._count.likes,
      hasLiked: userEmail ? r.likes.length > 0 : false,
      parentId: r.parentId,
      commenter: r.commenter,
      banned:
        r.status === CommentStatus.DELETED
          ? bannedSet.has(r.commenterId)
          : undefined,
      replies: [],
    })),
  }))
}

export async function createComment(
  data: CreateCommentInput,
  commenterId: string,
  autoApprove: boolean
) {
  const sanitized = sanitizeBody(data.body)
  if (!sanitized) throw new ApiError("Comment body is empty", 400)

  const site = await db.site.findUniqueOrThrow({
    where: { siteKey: data.siteKey },
    select: {
      id: true,
      domain: true,
      emailNotificationsEnabled: true,
      emailSubjectPrefix: true,
      emailLogoUrl: true,
      emailAccentColor: true,
      emailFooterText: true,
      owner: { select: { email: true } },
    },
  })

  const page = await db.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: data.slug } },
    update: {},
    create: { siteId: site.id, slug: data.slug, url: data.url },
    select: { id: true, slug: true, url: true },
  })

  const raw = await db.comment.create({
    data: {
      body: sanitized,
      pageId: page.id,
      parentId: data.parentId ?? null,
      commenterId,
      status: autoApprove ? "APPROVED" : "PENDING",
    },
    select: buildCommentSelect(),
  })

  void notifyNewComment(
    { id: raw.id, body: raw.body },
    { name: raw.commenter.name },
    { slug: page.slug, url: page.url ?? null },
    site,
    { email: site.owner.email }
  )

  if (data.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: data.parentId },
      select: {
        id: true,
        body: true,
        commenter: {
          select: {
            name: true,
            email: true,
            notificationsEnabled: true,
            notificationToken: true,
          },
        },
      },
    })
    if (parent && parent.commenter.email !== raw.commenter.email) {
      void notifyReply(
        { id: raw.id, body: raw.body },
        { name: raw.commenter.name },
        { id: parent.id, body: parent.body },
        parent.commenter,
        { slug: page.slug, url: page.url ?? null },
        site
      )
    }
  }

  return {
    id: raw.id,
    body: raw.body,
    status: raw.status,
    createdAt: raw.createdAt.toISOString(),
    editedAt: raw.editedAt?.toISOString() ?? null,
    likeCount: 0,
    hasLiked: false,
    parentId: raw.parentId,
    commenter: raw.commenter,
    replies: [],
  }
}

export async function updateCommentBody(commentId: string, body: string) {
  const sanitized = sanitizeBody(body)
  if (!sanitized) throw new ApiError("Comment body is empty", 400)

  const raw = await db.comment.update({
    where: { id: commentId },
    data: { body: sanitized, editedAt: new Date() },
    select: buildCommentSelect(),
  })

  return {
    id: raw.id,
    body: raw.body,
    status: raw.status,
    createdAt: raw.createdAt.toISOString(),
    editedAt: raw.editedAt?.toISOString() ?? null,
    likeCount: raw._count.likes,
    hasLiked: false,
    parentId: raw.parentId,
    commenter: raw.commenter,
    replies: [],
  }
}

export async function deleteComment(commentId: string) {
  const raw = await db.comment.update({
    where: { id: commentId },
    data: { status: "DELETED" },
    select: buildCommentSelect(),
  })

  return {
    id: raw.id,
    body: raw.body,
    status: raw.status,
    createdAt: raw.createdAt.toISOString(),
    editedAt: raw.editedAt?.toISOString() ?? null,
    likeCount: raw._count.likes,
    hasLiked: false,
    parentId: raw.parentId,
    commenter: raw.commenter,
    replies: [],
  }
}

export async function toggleCommentLike(commentId: string, userEmail: string) {
  const existing = await db.commentLike.findUnique({
    where: { commentId_userEmail: { commentId, userEmail } },
  })

  if (existing) {
    await db.commentLike.delete({
      where: { id: existing.id },
    })
    const count = await db.commentLike.count({ where: { commentId } })
    return { liked: false, count }
  }

  await db.commentLike.create({
    data: { commentId, userEmail },
  })
  const count = await db.commentLike.count({ where: { commentId } })
  return { liked: true, count }
}
