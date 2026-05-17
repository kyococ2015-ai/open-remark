import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSiteByIdForOwner } from "@/lib/services/site-service"
import { getCommentsByCommenterOnSite } from "@/lib/services/user-service"
import { ok } from "@/lib/api/response"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; commenterId: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { siteId, commenterId } = await params

  try {
    await getSiteByIdForOwner(siteId, session.user.id as string)
  } catch {
    return NextResponse.json({ error: "Site not found" }, { status: 404 })
  }

  const comments = await getCommentsByCommenterOnSite(siteId, commenterId)
  return ok(comments)
}
