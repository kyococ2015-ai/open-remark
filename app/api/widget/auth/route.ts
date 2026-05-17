import { NextRequest, NextResponse } from "next/server"
import { signWidgetToken } from "@/lib/auth-widget"
import { db } from "@/lib/db"
import { corsHeaders } from "@/lib/cors"
import { rateLimit } from "@/lib/rate-limit"
import { ApiError, handleApiError } from "@/lib/api/error"

async function generateUsername(name: string): Promise<string> {
  const base = name
    .split(" ")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
  if (!base) return "user"

  let username = base
  let counter = 2

  while (await db.commenter.findUnique({ where: { username } })) {
    username = `${base}${counter}`
    counter++
  }

  return username
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") ?? ""
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") ?? ""
    const ip = req.headers.get("x-forwarded-for") ?? "unknown"

    const { ok: rateLimitOk } = rateLimit(`auth:${ip}`, 5, 60_000)
    if (!rateLimitOk) throw new ApiError("Rate limit exceeded", 429)

    const body = await req.json()
    const { code, codeVerifier } = body as {
      code?: string
      codeVerifier?: string
    }
    if (!code) throw new ApiError("code required", 400)
    if (!codeVerifier) throw new ApiError("code_verifier required", 400)

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/widget/oauth-callback`,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error("Google token exchange failed:", errText)
      throw new ApiError("Invalid Google authorization code", 401)
    }

    const tokenData = (await tokenRes.json()) as { id_token: string }
    const idToken = tokenData.id_token

    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    )
    if (!googleRes.ok) throw new ApiError("Invalid Google token", 401)

    const googlePayload = (await googleRes.json()) as {
      email: string
      name: string
      picture: string
      aud: string
    }

    if (googlePayload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new ApiError("Token audience mismatch", 401)
    }

    const commenter = await db.commenter.upsert({
      where: { email: googlePayload.email },
      update: {},
      create: {
        email: googlePayload.email,
        name: googlePayload.name,
        image: googlePayload.picture,
        username: await generateUsername(googlePayload.name),
      },
    })

    const widgetToken = await signWidgetToken({
      email: googlePayload.email,
      name: googlePayload.name,
      image: googlePayload.picture,
      commenterId: commenter.id,
    })

    return NextResponse.json(
      { token: widgetToken },
      { status: 200, headers: corsHeaders(origin) }
    )
  } catch (err) {
    return handleApiError(err)
  }
}
