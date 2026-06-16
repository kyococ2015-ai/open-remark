import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { requireSiteAccess } from "@/lib/services/membership-service"
import { getCommentersBySite } from "@/lib/services/user-service"
import { ok } from "@/lib/api/response"
import { handleApiError, ApiError } from "@/lib/api/error"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)

    await requireSiteAccess(siteId, session.user.id, "MODERATE")

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const search = searchParams.get("search") ?? undefined

    const result = await getCommentersBySite(siteId, {
      page,
      limit: 20,
      search,
    })
    return ok(result)
  } catch (err) {
    return handleApiError(err)
  }
}
