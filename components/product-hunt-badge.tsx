import config from "@/config/config.json"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
}

export function ProductHuntBadge({ className }: Props) {
  if (!config.product_hunt.enable) return null

  return (
    <div
      className={cn("[&_img]:h-9 [&_img]:w-auto [&_img]:rounded-md", className)}
      dangerouslySetInnerHTML={{ __html: config.product_hunt.product_tag_link }}
    />
  )
}
