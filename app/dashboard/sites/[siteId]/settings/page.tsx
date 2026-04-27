"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Site = {
  id: string;
  name: string;
  domain: string;
  autoApprove: boolean;
  allowedOrigins: string;
};

export default function SiteSettingsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/sites/${siteId}`)
      .then((r) => r.json())
      .then(setSite);
  }, [siteId]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const originsRaw = (form.get("allowedOrigins") as string)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch(`/api/v1/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        domain: form.get("domain"),
        autoApprove: form.get("autoApprove") === "on",
        allowedOrigins: originsRaw,
      }),
    });

    if (res.ok) {
      toast.success("Settings saved");
      setSite(await res.json());
    } else {
      toast.error("Failed to save");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this site and all its comments? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/v1/sites/${siteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Site deleted");
      router.push("/dashboard/sites");
    } else {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  }

  if (!site) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;

  const origins = (() => {
    try { return (JSON.parse(site.allowedOrigins) as string[]).join("\n"); }
    catch { return ""; }
  })();

  return (
    <div>
      <PageHeader title="Site Settings" description={site.name} />
      <div className="p-6 max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Site name</Label>
                <Input id="name" name="name" defaultValue={site.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" name="domain" defaultValue={site.domain} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="allowedOrigins">
                  Allowed origins (one per line)
                </Label>
                <Textarea
                  id="allowedOrigins"
                  name="allowedOrigins"
                  defaultValue={origins}
                  rows={4}
                  placeholder={"https://myblog.com\nhttps://www.myblog.com"}
                />
                <p className="text-xs text-muted-foreground">
                  Only these origins can post comments via the embed. Use * to
                  allow all (not recommended).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoApprove"
                  name="autoApprove"
                  defaultChecked={site.autoApprove}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="autoApprove" className="cursor-pointer">
                  Auto-approve comments
                </Label>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

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
      </div>
    </div>
  );
}
