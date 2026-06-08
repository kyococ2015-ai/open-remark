import Image from "next/image"
import { cn } from "@/lib/utils"
import config from "@/config/config.json"

const { logo, logo_darkmode, logo_width, logo_height, logo_text } = config.site

const width = Number(logo_width)
const height = Number(logo_height)

// Request the image at 2x its display size — sharper on high-DPI screens
// without relying on the (smaller) automatic srcSet breakpoints.
const sourceSize = { width: width * 2, height: height * 2 }

type Props = {
  className?: string
  // "auto" follows the site theme; "light"/"dark" pin a variant for
  // surfaces (e.g. the sign-in brand panel) that ignore the site theme.
  variant?: "auto" | "light" | "dark"
}

export function Logo({ className, variant = "auto" }: Props) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {variant !== "dark" && (
        <Image
          src={logo}
          alt={logo_text}
          {...sourceSize}
          className={cn(
            "inline-block h-auto max-w-[160px]",
            variant === "auto" && "dark:hidden"
          )}
          priority
        />
      )}
      {variant !== "light" && (
        <Image
          src={logo_darkmode}
          alt={logo_text}
          {...sourceSize}
          className={cn(
            "inline-block h-auto max-w-[160px]",
            variant === "auto" ? "hidden dark:block" : "block"
          )}
          priority
        />
      )}
    </span>
  )
}
