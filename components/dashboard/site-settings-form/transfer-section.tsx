"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type TransferStep =
  | "idle"
  | "looking"
  | "looked-up"
  | "transferring"
  | "success"
  | "error"

type Props = {
  siteId: string
}

export function TransferSection({ siteId }: Props) {
  const router = useRouter()
  const [transferEmail, setTransferEmail] = useState("")
  const [transferStep, setTransferStep] = useState<TransferStep>("idle")
  const [transferRecipient, setTransferRecipient] = useState<{
    name: string | null
    email: string
  } | null>(null)
  const [transferError, setTransferError] = useState("")
  const transferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (transferTimerRef.current) clearTimeout(transferTimerRef.current)
    }
  }, [])

  async function handleLookup() {
    setTransferStep("looking")
    setTransferError("")
    try {
      const res = await fetch(
        `/api/v1/users/lookup?email=${encodeURIComponent(transferEmail)}`
      )
      if (res.ok) {
        const user = (await res.json()) as {
          id: string
          name: string | null
          email: string
        }
        setTransferRecipient({ name: user.name, email: user.email })
        setTransferStep("looked-up")
      } else {
        const data = (await res.json()) as { error?: string }
        setTransferError(data.error ?? "No user found with that email.")
        setTransferStep("error")
      }
    } catch {
      setTransferError("Network error. Please try again.")
      setTransferStep("error")
    }
  }

  async function handleTransfer() {
    setTransferStep("transferring")
    try {
      const res = await fetch(`/api/v1/sites/${siteId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: transferEmail }),
      })
      if (res.ok) {
        setTransferStep("success")
        transferTimerRef.current = setTimeout(() => {
          router.push("/dashboard/sites")
          router.refresh()
        }, 3000)
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Transfer failed")
        setTransferStep("looked-up")
      }
    } catch {
      toast.error("Network error. Transfer failed.")
      setTransferStep("looked-up")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Transfer Ownership</CardTitle>
        <CardDescription>
          Transfer this site to another registered user. You will lose access
          immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {transferStep === "success" ? (
          <p className="text-sm text-green-600">
            Site transferred to{" "}
            {transferRecipient?.name ?? transferRecipient?.email}. Redirecting…
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transferEmail">New owner email</Label>
              <Input
                id="transferEmail"
                type="email"
                value={transferEmail}
                onChange={(e) => {
                  setTransferEmail(e.target.value)
                  if (transferStep !== "idle") {
                    setTransferStep("idle")
                    setTransferRecipient(null)
                    setTransferError("")
                  }
                }}
                disabled={
                  transferStep === "looking" || transferStep === "transferring"
                }
                placeholder="user@example.com"
              />
              {transferError && (
                <p className="text-xs text-destructive">{transferError}</p>
              )}
            </div>

            {(transferStep === "idle" ||
              transferStep === "looking" ||
              transferStep === "error") && (
              <Button
                type="button"
                variant="outline"
                onClick={handleLookup}
                disabled={!transferEmail || transferStep === "looking"}
              >
                {transferStep === "looking" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Looking up…
                  </>
                ) : (
                  "Look up user"
                )}
              </Button>
            )}

            {(transferStep === "looked-up" ||
              transferStep === "transferring") &&
              transferRecipient && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <span className="font-medium">
                      {transferRecipient.name ?? "Unknown"}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {transferRecipient.email}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleTransfer}
                      disabled={transferStep === "transferring"}
                    >
                      {transferStep === "transferring" ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Transferring…
                        </>
                      ) : (
                        "Confirm Transfer"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={transferStep === "transferring"}
                      onClick={() => {
                        setTransferStep("idle")
                        setTransferRecipient(null)
                        setTransferEmail("")
                        setTransferError("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
