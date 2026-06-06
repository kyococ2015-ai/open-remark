import { NextRequest, NextResponse } from "next/server"
import { unsubscribeCommenter } from "@/lib/services/user-service"

const SHELL = (body: string) =>
  `<!DOCTYPE html><html><head><title>Unsubscribe</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:420px;margin:80px auto;text-align:center;color:#374151;padding:0 16px}h1{font-size:22px;font-weight:600;margin-bottom:8px}p{color:#6b7280;font-size:15px}</style></head><body>${body}</body></html>`

function htmlResponse(body: string, status = 200) {
  return new NextResponse(SHELL(body), {
    status,
    headers: { "Content-Type": "text/html" },
  })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")

  if (!token) {
    return htmlResponse(
      "<h1>Invalid link</h1><p>This unsubscribe link is missing a token.</p>",
      400
    )
  }

  const found = await unsubscribeCommenter(token)

  if (!found) {
    return htmlResponse(
      "<h1>Not found</h1><p>This unsubscribe link is not valid.</p>",
      404
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  return htmlResponse(
    `<h1>You've been unsubscribed</h1><p>You will no longer receive email notifications.</p><p style="margin-top:16px"><a href="${appUrl}/api/subscribe?token=${token}" style="color:#6b7280;font-size:13px">Changed your mind? Re-subscribe</a></p>`
  )
}
