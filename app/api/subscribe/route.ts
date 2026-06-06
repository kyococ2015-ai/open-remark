import { NextRequest, NextResponse } from "next/server"
import { resubscribeCommenter } from "@/lib/services/user-service"

const SHELL = (body: string) =>
  `<!DOCTYPE html><html><head><title>Subscribe</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:420px;margin:80px auto;text-align:center;color:#374151;padding:0 16px}h1{font-size:22px;font-weight:600;margin-bottom:8px}p{color:#6b7280;font-size:15px}</style></head><body>${body}</body></html>`

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
      "<h1>Invalid link</h1><p>This link is missing a token.</p>",
      400
    )
  }

  const found = await resubscribeCommenter(token)

  if (!found) {
    return htmlResponse("<h1>Not found</h1><p>This link is not valid.</p>", 404)
  }

  return htmlResponse(
    "<h1>You're re-subscribed</h1><p>You will receive email notifications again.</p>"
  )
}
