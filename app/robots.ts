import type { MetadataRoute } from "next"
import { getBaseUrl } from "@/lib/utils"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / non-indexable areas: admin dashboard, auth, APIs, and the
      // internal design-system showcase.
      disallow: ["/dashboard", "/sign-in", "/api/", "/elements"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
