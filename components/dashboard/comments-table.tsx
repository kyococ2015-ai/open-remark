"use client"

import { useState } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  patchCommentStatus,
  patchCommentBody,
} from "@/lib/services/comment-client"
import { useOptimisticState } from "@/hooks/use-optimistic-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Check,
  MoreHorizontal,
  ShieldAlert,
  Trash2,
  Eye,
  Pencil,
} from "lucide-react"

const COMMENT_STATUS = {
  APPROVED: "APPROVED",
  PENDING: "PENDING",
  SPAM: "SPAM",
  DELETED: "DELETED",
} as const

type CommentStatus = (typeof COMMENT_STATUS)[keyof typeof COMMENT_STATUS]

type Comment = {
  id: string
  body: string
  commenter: {
    name: string
    email: string
    image: string | null
  }
  status: CommentStatus
  createdAt: Date
  editedAt?: Date | null
  page: { slug: string; url: string | null }
}

type Props = {
  comments: Comment[]
  onStatusChange?: () => void
}

const STATUS_BADGE: Record<
  CommentStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    className?: string
  }
> = {
  APPROVED: { label: "Approved", variant: "default" },
  PENDING: { label: "Pending", variant: "secondary" },
  SPAM: {
    label: "Spam",
    variant: "outline",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
  },
  DELETED: {
    label: "Deleted",
    variant: "outline",
    className:
      "border-border bg-muted text-muted-foreground line-through decoration-muted-foreground/40",
  },
}

export function CommentsTable({ comments, onStatusChange }: Props) {
  const [preview, setPreview] = useState<Comment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null)
  const [editTarget, setEditTarget] = useState<Comment | null>(null)
  const [editBody, setEditBody] = useState("")

  const {
    data: optimisticComments,
    updateItem,
    revertItem,
    setBusy,
    isBusy,
  } = useOptimisticState<Comment>(comments)

  async function handleStatusChange(id: string, status: CommentStatus) {
    const original = optimisticComments.find((c) => c.id === id)
    if (!original) return

    updateItem((c) => c.id === id, { status })
    setBusy(id, true)

    try {
      await patchCommentStatus(id, status)
      toast.success(`Comment ${status.toLowerCase()}`)
      onStatusChange?.()
    } catch {
      revertItem((c) => c.id === id, original)
      toast.error("Action failed. Changes reverted.")
    } finally {
      setBusy(id, false)
    }
  }

  async function handleBodyUpdate(id: string, body: string) {
    const original = optimisticComments.find((c) => c.id === id)
    if (!original) return

    updateItem((c) => c.id === id, { body, editedAt: new Date() })
    setEditTarget(null)
    setBusy(id, true)

    try {
      await patchCommentBody(id, body)
      toast.success("Comment updated")
      onStatusChange?.()
    } catch {
      revertItem((c) => c.id === id, original)
      toast.error("Update failed. Changes reverted.")
    } finally {
      setBusy(id, false)
    }
  }

  if (optimisticComments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">No comments found</p>
      </div>
    )
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
            {optimisticComments.map((comment) => {
              const badge = STATUS_BADGE[comment.status]
              return (
                <TableRow key={comment.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="size-7 shrink-0">
                        <AvatarImage src={comment.commenter.image ?? ""} />
                        <AvatarFallback className="text-xs">
                          {comment.commenter.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {comment.commenter.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {comment.commenter.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p
                      className={
                        comment.status === COMMENT_STATUS.DELETED
                          ? "text-sm text-muted-foreground italic"
                          : "line-clamp-2 text-sm"
                      }
                    >
                      {comment.status === COMMENT_STATUS.DELETED
                        ? "Comment Removed"
                        : comment.body}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-36 truncate font-mono text-xs text-muted-foreground">
                      {comment.page.slug}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant} className={badge.className}>
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
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
                          disabled={isBusy(comment.id)}
                          aria-label={`Actions for comment by ${comment.commenter.name}`}
                        >
                          <MoreHorizontal
                            className="size-4"
                            aria-hidden="true"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreview(comment)}>
                          <Eye className="mr-2 size-4" aria-hidden="true" />
                          View full
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditTarget(comment)
                            setEditBody(comment.body)
                          }}
                        >
                          <Pencil className="mr-2 size-4" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {comment.status !== COMMENT_STATUS.APPROVED && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(
                                comment.id,
                                COMMENT_STATUS.APPROVED
                              )
                            }
                          >
                            <Check
                              className="text-success mr-2 size-4"
                              aria-hidden="true"
                            />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {comment.status !== COMMENT_STATUS.SPAM && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(
                                comment.id,
                                COMMENT_STATUS.SPAM
                              )
                            }
                          >
                            <ShieldAlert
                              className="text-warning mr-2 size-4"
                              aria-hidden="true"
                            />
                            Mark as spam
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(comment)}
                        >
                          <Trash2 className="mr-2 size-4" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
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
          <div className="mt-2 flex items-center gap-2">
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
              This comment will be marked as deleted. Replies will remain
              visible.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isBusy(deleteTarget?.id ?? "")}
              onClick={async () => {
                if (!deleteTarget) return
                await handleStatusChange(
                  deleteTarget.id,
                  COMMENT_STATUS.DELETED
                )
                setDeleteTarget(null)
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
            <DialogDescription>
              By {editTarget?.commenter.name}
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[100px] w-full resize-none rounded-md border bg-background p-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            disabled={isBusy(editTarget?.id ?? "")}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={isBusy(editTarget?.id ?? "") || !editBody.trim()}
              onClick={() => {
                if (!editTarget) return
                handleBodyUpdate(editTarget.id, editBody)
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
