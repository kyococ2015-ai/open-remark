import { NextRequest, NextResponse } from "next/server";
import { toggleCommentLike } from "@/lib/services/comment-service";
import { verifyWidgetToken } from "@/lib/auth-widget";
import { corsHeaders } from "@/lib/cors";
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

export async function POST(
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

    const result = await toggleCommentLike(id, payload.sub);
    return buildCorsResponse(req, result);
  } catch (err) {
    return handleApiError(err);
  }
}
