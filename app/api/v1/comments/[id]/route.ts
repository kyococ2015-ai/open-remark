import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { UpdateCommentStatusSchema } from "@/lib/validators/comment";
import { moderateComment } from "@/lib/services/moderation-service";
import { handleApiError, ApiError } from "@/lib/api/error";
import { ok } from "@/lib/api/response";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) throw new ApiError("Unauthorized", 401);

    const body = await req.json();
    const parsed = UpdateCommentStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const comment = await moderateComment(id, parsed.data.status, session.user.email);
    return ok(comment);
  } catch (err) {
    return handleApiError(err);
  }
}
