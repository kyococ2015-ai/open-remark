import { NextRequest, NextResponse } from "next/server";
import { CreateCommentSchema } from "@/lib/validators/comment";
import {
  getApprovedCommentsForPage,
  createComment,
} from "@/lib/services/comment-service";
import { getSiteBySiteKey } from "@/lib/services/site-service";
import { isCommenterBannedOnSite } from "@/lib/services/user-service";
import { verifyWidgetToken } from "@/lib/auth-widget";
import { isOriginAllowed, getEffectiveOrigin, corsHeaders } from "@/lib/cors";
import { rateLimit } from "@/lib/rate-limit";
import { handleApiError, ApiError } from "@/lib/api/error";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const siteKey = searchParams.get("siteKey");
    const slug = searchParams.get("slug");
    if (!siteKey || !slug) throw new ApiError("siteKey and slug required", 400);

    const site = await getSiteBySiteKey(siteKey);

    // Extract user from optional auth header for personalized state
    let userEmail: string | undefined;
    let isBanned = false;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = await verifyWidgetToken(token);
      if (payload) {
        userEmail = payload.sub;
        isBanned = await isCommenterBannedOnSite(site.id, payload.commenterId);
      }
    }

    const comments = await getApprovedCommentsForPage(site.id, slug, userEmail);
    return buildCorsResponse(req, {
      comments,
      config: {
        theme: site.theme,
        primaryColor: site.primaryColor,
        radius: site.radius,
        currentUser: userEmail ? { isBanned } : undefined,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    const { ok: rateLimitOk } = rateLimit(`post:${ip}`, 10, 60_000);
    if (!rateLimitOk) throw new ApiError("Rate limit exceeded", 429);

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError("Unauthorized", 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyWidgetToken(token);
    if (!payload) throw new ApiError("Invalid token", 401);

    const body = await req.json();
    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const site = await getSiteBySiteKey(parsed.data.siteKey);

    const effectiveOrigin = getEffectiveOrigin(req);
    if (!isOriginAllowed(effectiveOrigin, site.allowedOrigins)) {
      throw new ApiError("Origin not allowed", 403);
    }

    const comment = await createComment(
      parsed.data,
      payload.commenterId,
      site.autoApprove,
    );

    return buildCorsResponse(req, comment, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
