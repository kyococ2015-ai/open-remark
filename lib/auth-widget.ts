import { SignJWT, jwtVerify } from "jose"

export type WidgetPayload = {
  sub: string // authorEmail
  name: string
  image?: string
  commenterId: string
  iat: number
  exp: number
}

const secret = () =>
  new TextEncoder().encode(process.env.WIDGET_JWT_SECRET ?? "fallback-secret")

export async function signWidgetToken(payload: {
  email: string
  name: string
  image?: string
  commenterId: string
}): Promise<string> {
  return new SignJWT({
    sub: payload.email,
    name: payload.name,
    image: payload.image,
    commenterId: payload.commenterId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret())
}

export async function verifyWidgetToken(
  token: string
): Promise<WidgetPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as WidgetPayload
  } catch {
    return null
  }
}
