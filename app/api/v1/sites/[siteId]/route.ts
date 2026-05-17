import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { UpdateSiteSchema } from "@/lib/validators/site"
import {
  getSiteByIdForOwner,
  updateSite,
  deleteSite,
} from "@/lib/services/site-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok, noContent } from "@/lib/api/response"

type Params = { params: Promise<{ siteId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const site = await getSiteByIdForOwner(siteId, session.user.id)
    return ok(site)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)

    const body = await req.json()
    const parsed = UpdateSiteSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const messages = [
        ...flat.formErrors,
        ...Object.values(flat.fieldErrors).flat(),
      ].filter(Boolean)
      return NextResponse.json(
        { error: messages.join("; ") || "Validation failed" },
        { status: 422 }
      )
    }

    const site = await updateSite(siteId, session.user.id, parsed.data)
    return ok(site)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    await deleteSite(siteId, session.user.id)
    return noContent()
  } catch (err) {
    return handleApiError(err)
  }
}
