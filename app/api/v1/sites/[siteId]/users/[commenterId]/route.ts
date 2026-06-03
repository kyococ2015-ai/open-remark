import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSiteByIdForOwner } from "@/lib/services/site-service"
import { updateCommenterNotifications } from "@/lib/services/user-service"
import { ok } from "@/lib/api/response"
import { ApiError, handleApiError } from "@/lib/api/error"

type Params = { params: Promise<{ siteId: string; commenterId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { siteId, commenterId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)

    await getSiteByIdForOwner(siteId, session.user.id)

    const body = await req.json()
    if (typeof body.notificationsEnabled !== "boolean") {
      return NextResponse.json(
        { error: "notificationsEnabled must be boolean" },
        { status: 422 }
      )
    }

    await updateCommenterNotifications(commenterId, body.notificationsEnabled)
    return ok({ notificationsEnabled: body.notificationsEnabled })
  } catch (err) {
    return handleApiError(err)
  }
}
