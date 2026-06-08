export function parseOrigins(raw: string): string[] {
  try {
    const arr = JSON.parse(raw) as string[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
