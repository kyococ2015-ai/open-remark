"use client"

import { useState } from "react"
import { RiGlobalLine } from "@remixicon/react"

type Props = {
  domain: string
  size?: number
  className?: string
}

function faviconUrl(domain: string): string {
  const base = domain.startsWith("http") ? domain : `https://${domain}`
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(base)}&size=64`
}

export function SiteLogo({ domain, size = 32, className }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <RiGlobalLine
        style={{ width: size, height: size, flexShrink: 0 }}
        className={className}
        aria-hidden="true"
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external favicon URL, next/image unsupported
    <img
      src={faviconUrl(domain)}
      alt=""
      width={size}
      height={size}
      className={className}
      onError={() => setFailed(true)}
      aria-hidden="true"
    />
  )
}
