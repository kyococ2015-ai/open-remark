import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireSiteAccess } from "@/lib/services/membership-service"
import {
  banCommenterOnSite,
  unbanCommenterOnSite,
  deleteAllCommentsByCommenterOnSite,
} from "@/lib/services/user-service"
import { ok } from "@/lib/api/response"
import { handleApiError, ApiError } from "@/lib/api/error"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; commenterId: string }> }
) {
  try {
    const { siteId, commenterId } = await params
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email)
      throw new ApiError("Unauthorized", 401)

    await requireSiteAccess(siteId, session.user.id, "MODERATE")

    const body = await request.json()
    const action = body.action

    if (action === "ban") {
      const result = await banCommenterOnSite(siteId, commenterId)
      return ok(result)
    }

    if (action === "unban") {
      const result = await unbanCommenterOnSite(siteId, commenterId)
      return ok(result)
    }

    if (action === "deleteAll") {
      const result = await deleteAllCommentsByCommenterOnSite(
        siteId,
        commenterId,
        session.user.email
      )
      return ok(result)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    if (err instanceof Error && err.message.includes("already banned")) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return handleApiError(err)
  }
}
