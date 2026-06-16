import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { ChangeRoleSchema, RemoveMemberSchema } from "@/lib/validators/member"
import {
  listMembers,
  changeRole,
  removeMember,
} from "@/lib/services/membership-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok, noContent } from "@/lib/api/response"

type Params = { params: Promise<{ siteId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const members = await listMembers(siteId)
    return ok(members)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const parsed = ChangeRoleSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }
    const member = await changeRole(
      siteId,
      session.user.id,
      parsed.data.userId,
      parsed.data.role
    )
    revalidatePath(`/dashboard/sites/${siteId}/team`)
    return ok(member)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const parsed = RemoveMemberSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }
    await removeMember(siteId, session.user.id, parsed.data.userId)
    revalidatePath(`/dashboard/sites/${siteId}/team`)
    return noContent()
  } catch (err) {
    return handleApiError(err)
  }
}
