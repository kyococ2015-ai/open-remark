import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"
import { deletePage } from "@/lib/services/page-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { noContent } from "@/lib/api/response"

type Params = { params: Promise<{ siteId: string; pageId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { siteId, pageId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    await deletePage(siteId, pageId, session.user.id)
    return noContent()
  } catch (err) {
    return handleApiError(err)
  }
}
