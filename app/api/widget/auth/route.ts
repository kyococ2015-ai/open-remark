import { NextRequest, NextResponse } from "next/server";
import { signWidgetToken } from "@/lib/auth-widget";
import { corsHeaders } from "@/lib/cors";
import { rateLimit } from "@/lib/rate-limit";
import { ApiError, handleApiError } from "@/lib/api/error";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") ?? "";
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    const { ok: rateLimitOk } = rateLimit(`auth:${ip}`, 5, 60_000);
    if (!rateLimitOk) throw new ApiError("Rate limit exceeded", 429);

    // This endpoint receives a Google id_token from the widget popup
    // and issues a short-lived widget JWT
    const body = await req.json();
    const { idToken } = body as { idToken?: string };
    if (!idToken) throw new ApiError("idToken required", 400);

    // Verify Google id_token
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );
    if (!googleRes.ok) throw new ApiError("Invalid Google token", 401);

    const googlePayload = (await googleRes.json()) as {
      email: string;
      name: string;
      picture: string;
      aud: string;
    };

    if (googlePayload.aud !== process.env.AUTH_GOOGLE_ID) {
      throw new ApiError("Token audience mismatch", 401);
    }

    const widgetToken = await signWidgetToken({
      email: googlePayload.email,
      name: googlePayload.name,
      image: googlePayload.picture,
    });

    return NextResponse.json({ token: widgetToken }, { status: 200, headers: corsHeaders(origin) });
  } catch (err) {
    return handleApiError(err);
  }
}
