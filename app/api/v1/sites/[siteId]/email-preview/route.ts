import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSiteByIdForOwner } from "@/lib/services/site-service"
import { previewTemplate } from "@/lib/email/email-service"
import { ApiError, handleApiError } from "@/lib/api/error"

type Params = { params: Promise<{ siteId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)

    const site = await getSiteByIdForOwner(siteId, session.user.id)

    const type = req.nextUrl.searchParams.get("type")
    if (type !== "new-comment" && type !== "reply") {
      return NextResponse.json(
        { error: "type must be new-comment or reply" },
        { status: 422 }
      )
    }

    const html = await previewTemplate(type, site)
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
