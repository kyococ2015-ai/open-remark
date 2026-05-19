import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { getCommentsBySite } from "@/lib/services/comment-service"
import { bulkModerate } from "@/lib/services/moderation-service"
import { BulkUpdateCommentStatusSchema } from "@/lib/validators/comment"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok } from "@/lib/api/response"
import { CommentStatus } from "@/generated/prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)

    const { searchParams } = req.nextUrl
    const siteId = searchParams.get("siteId")
    if (!siteId) throw new ApiError("siteId required", 400)

    const status = searchParams.get("status") as CommentStatus | null
    const page = parseInt(searchParams.get("page") ?? "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)

    const search = searchParams.get("search")

    const result = await getCommentsBySite(siteId, {
      status: status ?? undefined,
      page,
      limit,
      search: search ?? undefined,
    })

    return ok(result)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) throw new ApiError("Unauthorized", 401)

    const parsed = BulkUpdateCommentStatusSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 422 }
      )
    }

    await bulkModerate(parsed.data.ids, parsed.data.status, session.user.email)
    return ok({ count: parsed.data.ids.length })
  } catch (err) {
    return handleApiError(err)
  }
}
