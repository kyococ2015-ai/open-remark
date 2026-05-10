"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
// Replicate enum locally — avoids pulling Prisma (Node-only) into a client bundle
const CommentStatus = {
  APPROVED: "APPROVED",
  PENDING: "PENDING",
  SPAM: "SPAM",
  DELETED: "DELETED",
} as const;
type CommentStatus = (typeof CommentStatus)[keyof typeof CommentStatus];
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, MoreHorizontal, ShieldAlert, Trash2, Eye, Pencil } from "lucide-react";

type Comment = {
  id: string;
  body: string;
  commenter: {
    name: string;
    email: string;
    image: string | null;
  };
  status: CommentStatus;
  createdAt: Date;
  editedAt?: Date | null;
  page: { slug: string; url: string | null };
};

type Props = {
  comments: Comment[];
  onStatusChange?: () => void;
};

const statusBadge: Record<CommentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  APPROVED: { label: "Approved", variant: "default" },
  PENDING: { label: "Pending", variant: "secondary" },
  SPAM: { label: "Spam", variant: "destructive" },
  DELETED: { label: "Deleted", variant: "outline" },
};

async function patchComment(id: string, status: CommentStatus) {
  const res = await fetch(`/api/v1/comments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed");
}

async function patchCommentBody(id: string, body: string) {
  const res = await fetch(`/api/v1/comments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error("Failed");
}

export function CommentsTable({ comments, onStatusChange }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<Comment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [editTarget, setEditTarget] = useState<Comment | null>(null);
  const [editBody, setEditBody] = useState("");

  async function act(id: string, status: CommentStatus) {
    setBusy(id);
    try {
      await patchComment(id, status);
      toast.success(`Comment ${status.toLowerCase()}`);
      onStatusChange?.();
    } catch {
      toast.error("Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">No comments found</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Author</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((c) => {
              const badge = statusBadge[c.status];
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="size-7 shrink-0">
                        <AvatarImage src={c.commenter.image ?? ""} />
                        <AvatarFallback className="text-xs">
                          {c.commenter.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.commenter.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.commenter.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm line-clamp-2">{c.body}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-mono text-muted-foreground truncate max-w-36">
                      {c.page.slug}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(c.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={busy === c.id}
                          aria-label={`Actions for comment by ${c.commenter.name}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreview(c)}>
                          <Eye className="mr-2 size-4" aria-hidden="true" />
                          View full
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditTarget(c); setEditBody(c.body); }}>
                          <Pencil className="mr-2 size-4" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {c.status !== CommentStatus.APPROVED && (
                          <DropdownMenuItem
                            onClick={() => act(c.id, CommentStatus.APPROVED)}
                          >
                            <Check className="mr-2 size-4 text-success" aria-hidden="true" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {c.status !== CommentStatus.SPAM && (
                          <DropdownMenuItem
                            onClick={() => act(c.id, CommentStatus.SPAM)}
                          >
                            <ShieldAlert className="mr-2 size-4 text-warning" aria-hidden="true" />
                            Mark as spam
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="mr-2 size-4" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comment by {preview?.commenter.name}</DialogTitle>
            <DialogDescription>{preview?.commenter.email}</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
            {preview?.body}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-muted-foreground">
              On <span className="font-mono">{preview?.page.slug}</span>
            </p>
            {preview?.editedAt && (
              <span className="text-xs text-muted-foreground">· edited</span>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>
              This will mark the comment as deleted. The action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy === deleteTarget?.id}
              onClick={async () => {
                if (!deleteTarget) return;
                await act(deleteTarget.id, CommentStatus.DELETED);
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit comment</DialogTitle>
            <DialogDescription>By {editTarget?.commenter.name}</DialogDescription>
          </DialogHeader>
          <textarea
            className="w-full min-h-[100px] p-3 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            disabled={busy === editTarget?.id}
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy === editTarget?.id || !editBody.trim()}
              onClick={async () => {
                if (!editTarget) return;
                setBusy(editTarget.id);
                try {
                  await patchCommentBody(editTarget.id, editBody);
                  toast.success("Comment updated");
                  setEditTarget(null);
                  onStatusChange?.();
                } catch {
                  toast.error("Update failed");
                } finally {
                  setBusy(null);
                }
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
