export function getEffectiveOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

export function isOriginAllowed(
  origin: string | null,
  allowedOriginsJson: string,
): boolean {
  if (!origin) return false;
  try {
    const allowed: string[] = JSON.parse(allowedOriginsJson);
    // No restrictions configured — allow all origins (useful for development
    // and for sites that haven't set up origin allow-listing yet).
    if (allowed.length === 0) return true;
    return allowed.some((o) => o === origin || o === "*");
  } catch {
    return false;
  }
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
