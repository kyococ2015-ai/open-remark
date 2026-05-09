import { NextRequest, NextResponse } from "next/server";
import { signWidgetToken } from "@/lib/auth-widget";
import { prisma } from "@/lib/prisma";
import { corsHeaders } from "@/lib/cors";
import { rateLimit } from "@/lib/rate-limit";
import { ApiError, handleApiError } from "@/lib/api/error";

async function generateUsername(name: string): Promise<string> {
  const base = name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!base) return "user";

  let username = base;
  let counter = 2;

  while (await prisma.commenter.findUnique({ where: { username } })) {
    username = `${base}${counter}`;
    counter++;
  }

  return username;
}

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

    const body = await req.json();
    const { idToken } = body as { idToken?: string };
    if (!idToken) throw new ApiError("idToken required", 400);

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

    const commenter = await prisma.commenter.upsert({
      where: { email: googlePayload.email },
      update: {},
      create: {
        email: googlePayload.email,
        name: googlePayload.name,
        image: googlePayload.picture,
        username: await generateUsername(googlePayload.name),
      },
    });

    const widgetToken = await signWidgetToken({
      email: googlePayload.email,
      name: googlePayload.name,
      image: googlePayload.picture,
      commenterId: commenter.id,
    });

    return NextResponse.json(
      { token: widgetToken },
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
