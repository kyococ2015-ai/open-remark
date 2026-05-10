import { NextRequest, NextResponse } from "next/server";
import { UpdateCommentBodySchema } from "@/lib/validators/comment";
import { updateCommentBody } from "@/lib/services/comment-service";
import { verifyWidgetToken } from "@/lib/auth-widget";
import { corsHeaders } from "@/lib/cors";
import { db } from "@/lib/db";
import { ApiError, handleApiError } from "@/lib/api/error";

function buildCorsResponse(req: NextRequest, body: unknown, status = 200) {
  const origin = req.headers.get("origin") ?? "";
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(origin),
  });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError("Unauthorized", 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyWidgetToken(token);
    if (!payload) throw new ApiError("Invalid token", 401);

    const body = await req.json();
    const parsed = UpdateCommentBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    // Verify ownership
    const comment = await db.comment.findUnique({
      where: { id },
      select: { commenterId: true },
    });
    if (!comment) throw new ApiError("Comment not found", 404);
    if (comment.commenterId !== payload.commenterId) {
      throw new ApiError("Forbidden", 403);
    }

    const updated = await updateCommentBody(id, parsed.data.body);
    return buildCorsResponse(req, updated);
  } catch (err) {
    return handleApiError(err);
  }
}
