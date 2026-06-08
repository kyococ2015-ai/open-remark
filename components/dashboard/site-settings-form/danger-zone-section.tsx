"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Props = {
  siteId: string
}

export function DangerZoneSection({ siteId }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (
      !confirm("Delete this site and all its comments? This cannot be undone.")
    )
      return
    setDeleting(true)
    const res = await fetch(`/api/v1/sites/${siteId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Site deleted")
      router.push("/dashboard/sites")
      router.refresh()
    } else {
      toast.error("Failed to delete")
      setDeleting(false)
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">
          Danger Zone
        </CardTitle>
        <CardDescription>
          Permanently delete this site and all its comments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete site"}
        </Button>
      </CardContent>
    </Card>
  )
}
