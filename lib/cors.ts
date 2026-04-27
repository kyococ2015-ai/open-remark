export function isOriginAllowed(
  origin: string | null,
  allowedOriginsJson: string,
): boolean {
  if (!origin) return false;
  try {
    const allowed: string[] = JSON.parse(allowedOriginsJson);
    return allowed.some((o) => o === origin || o === "*");
  } catch {
    return false;
  }
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
