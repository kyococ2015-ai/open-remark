import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import {
  UpdateCommentStatusSchema,
  UpdateCommentSchema,
} from "@/lib/validators/comment"
import {
  moderateComment,
  getSiteIdForComment,
} from "@/lib/services/moderation-service"
import { updateCommentBody } from "@/lib/services/comment-service"
import { requireSiteAccess } from "@/lib/services/membership-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok } from "@/lib/api/response"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email)
      throw new ApiError("Unauthorized", 401)

    const siteId = await getSiteIdForComment(id)
    await requireSiteAccess(siteId, session.user.id, "MODERATE")

    const body = await req.json()

    // Handle status update (existing behavior)
    if (body.status !== undefined) {
      const parsed = UpdateCommentStatusSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 422 }
        )
      }
      const comment = await moderateComment(
        id,
        parsed.data.status,
        session.user.email
      )
      return ok(comment)
    }

    // Handle body edit (new behavior)
    if (body.body !== undefined) {
      const parsed = UpdateCommentSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 422 }
        )
      }
      const comment = await updateCommentBody(id, parsed.data.body!)
      return ok(comment)
    }

    throw new ApiError("Either status or body is required", 400)
  } catch (err) {
    return handleApiError(err)
  }
}
