"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <AlertTriangle
        className="mb-4 size-12 text-destructive"
        aria-hidden="true"
      />
      <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        An error occurred while loading this page. You can try again or go back
        to the dashboard.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button
          onClick={() => (window.location.href = "/dashboard")}
          variant="outline"
        >
          Go to dashboard
        </Button>
      </div>
    </div>
  )
}
