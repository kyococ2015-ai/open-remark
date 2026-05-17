// Strip HTML tags and dangerous content from user-supplied comment body.
// Widget renders as plain text / markdown; we keep markdown chars but drop HTML.
export function sanitizeBody(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/javascript:/gi, "") // remove JS protocol
    .trim()
    .slice(0, 5000) // hard cap
}
