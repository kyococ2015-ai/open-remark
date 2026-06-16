import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { CreateInviteSchema, RevokeInviteSchema } from "@/lib/validators/member"
import {
  listPendingInvites,
  createInvite,
  revokeInvite,
} from "@/lib/services/membership-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok, noContent } from "@/lib/api/response"

type Params = { params: Promise<{ siteId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const invites = await listPendingInvites(siteId)
    return ok(invites)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const parsed = CreateInviteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }
    const result = await createInvite(
      siteId,
      session.user.id,
      parsed.data.email,
      parsed.data.role
    )
    revalidatePath(`/dashboard/sites/${siteId}/team`)
    return ok(result)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const parsed = RevokeInviteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }
    await revokeInvite(siteId, session.user.id, parsed.data.inviteId)
    revalidatePath(`/dashboard/sites/${siteId}/team`)
    return noContent()
  } catch (err) {
    return handleApiError(err)
  }
}
