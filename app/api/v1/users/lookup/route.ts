import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"
import { lookupUserByEmail } from "@/lib/services/user-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok } from "@/lib/api/response"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)

    const email = req.nextUrl.searchParams.get("email")
    if (!email) throw new ApiError("email query param required", 400)

    const user = await lookupUserByEmail(email)
    return ok(user)
  } catch (err) {
    return handleApiError(err)
  }
}
