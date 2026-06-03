import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { TransferSiteSchema } from "@/lib/validators/site"
import { transferSite } from "@/lib/services/site-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok } from "@/lib/api/response"

type Params = { params: Promise<{ siteId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)

    const body = await req.json()
    const parsed = TransferSiteSchema.safeParse(body)
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

    const site = await transferSite(siteId, session.user.id, parsed.data.email)
    return ok(site)
  } catch (err) {
    return handleApiError(err)
  }
}
