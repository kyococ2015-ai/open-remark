"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="fixed right-6 bottom-6 z-[100] flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-colors hover:bg-muted"
    >
      <Sun className="size-5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-5 dark:block" aria-hidden="true" />
    </button>
  )
}
