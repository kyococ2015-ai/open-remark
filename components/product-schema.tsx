import config from "@/config/config.json"
import { getBaseUrl } from "@/lib/utils"

interface PricingPlan {
  name: string
  price: string
  period: string
  description: string
  cta: { link: string; external?: boolean }
}

// Schema.org Product JSON-LD for the landing page. Offers are derived from the
// homepage pricing plans so the structured data stays in sync with the content.
export function ProductSchema({ plans }: { plans: PricingPlan[] }) {
  const baseUrl = getBaseUrl()

  const offers = plans.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    description: plan.description,
    price: plan.price.replace(/[^0-9.]/g, "") || "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: plan.cta.link.startsWith("http")
      ? plan.cta.link
      : `${baseUrl}${plan.cta.link}`,
  }))

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: config.site.title,
    description: config.metadata.meta_description,
    image: `${baseUrl}${config.metadata.meta_image}`,
    url: baseUrl,
    brand: {
      "@type": "Brand",
      name: config.metadata.meta_author,
    },
    offers,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
