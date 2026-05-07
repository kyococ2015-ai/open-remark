"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewSitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name") as string,
      domain: form.get("domain") as string,
      autoApprove: form.get("autoApprove") === "on",
      allowedOrigins: [(form.get("domain") as string)
        ? `https://${form.get("domain")}`
        : ""],
    };

    const res = await fetch("/api/v1/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const site = await res.json();
      toast.success("Site created!");
      router.push(`/dashboard/sites/${site.id}/install`);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create site");
    }

    setLoading(false);
  }

  return (
    <div>
      <PageHeader title="Add Site" description="Register a new site to embed comments" />
      <div className="p-6 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Site details</CardTitle>
            <CardDescription>
              Your site key will be generated automatically after registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Site name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Blog…"
                  required
                  minLength={1}
                  maxLength={100}
                  autoComplete="organization"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  name="domain"
                  placeholder="myblog.com"
                  required
                  pattern="[a-zA-Z0-9.-]+"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  Without https:// — e.g. myblog.com
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoApprove"
                  name="autoApprove"
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="autoApprove" className="cursor-pointer">
                  Auto-approve comments (skip moderation queue)
                </Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating…" : "Create site"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
