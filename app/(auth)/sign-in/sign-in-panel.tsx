"use client"

import { useRef, useState } from "react"
import Link from "next/link"

interface MouseState {
  x: number
  y: number
  active: boolean
}

export function SignInPanel() {
  const ref = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState<MouseState>({
    x: 50,
    y: 50,
    active: false,
  })

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      active: true,
    })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setMouse((m) => ({ ...m, active: false }))}
      className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex dark:bg-sidebar dark:text-foreground"
    >
      {/* Glowing orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-[480px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.7 0.15 162 / 0.35), transparent 65%)",
          animation: "orb-float-1 14s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-20 size-[420px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.13 175 / 0.28), transparent 65%)",
          animation: "orb-float-2 18s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/3 size-[280px] -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.14 155 / 0.18), transparent 65%)",
          animation: "orb-float-3 22s ease-in-out infinite",
        }}
      />

      {/* Base grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "grid-drift 12s linear infinite",
        }}
      />

      {/* Cursor-revealed bright grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "grid-drift 12s linear infinite",
          opacity: mouse.active ? 0.4 : 0,
          transition: "opacity 500ms ease",
          WebkitMaskImage: `radial-gradient(circle 180px at ${mouse.x}% ${mouse.y}%, black 0%, transparent 100%)`,
          maskImage: `radial-gradient(circle 180px at ${mouse.x}% ${mouse.y}%, black 0%, transparent 100%)`,
        }}
      />

      {/* Cursor glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle 220px at ${mouse.x}% ${mouse.y}%, oklch(0.7 0.15 162 / 0.18), transparent)`,
          opacity: mouse.active ? 1 : 0,
          transition: "opacity 500ms ease",
        }}
      />

      {/* Logo */}
      <Link href="/" className="relative flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          R
        </span>
        <span className="text-sm font-semibold tracking-tight">
          Open Remark
        </span>
      </Link>

      {/* Hero copy */}
      <div className="relative space-y-6">
        <p className="text-4xl leading-[1.15] font-semibold tracking-tight text-pretty">
          Comments that belong
          <br />
          to your site — not
          <br />
          someone else&apos;s platform.
        </p>

        <ul className="space-y-3 text-sm text-background/60 dark:text-foreground/60">
          {[
            "Self-hosted, open source, yours forever",
            "Drop-in embed — one script tag",
            "Moderation, spam filtering, full control",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-3.5 shrink-0 text-primary"
                fill="currentColor"
              >
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <p className="relative text-xs text-background/30 dark:text-foreground/30">
        Open source · MIT license
      </p>
    </div>
  )
}
