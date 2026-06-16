import { auth } from "@/lib/auth"
import { requireSiteAccess } from "@/lib/services/membership-service"
import { getCommentsByCommenterOnSite } from "@/lib/services/user-service"
import { ok } from "@/lib/api/response"
import { handleApiError, ApiError } from "@/lib/api/error"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; commenterId: string }> }
) {
  try {
    const { siteId, commenterId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)

    await requireSiteAccess(siteId, session.user.id, "MODERATE")

    const comments = await getCommentsByCommenterOnSite(siteId, commenterId)
    return ok(comments)
  } catch (err) {
    return handleApiError(err)
  }
}
