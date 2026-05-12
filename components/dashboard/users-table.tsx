'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { banCommenter, unbanCommenter, deleteAllCommentsByCommenter } from '@/lib/services/comment-client';
import { useOptimisticState } from '@/hooks/use-optimistic-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, ShieldAlert, Trash2, Eye } from 'lucide-react';
import { UserProfileDialog } from './user-profile-dialog';
import type { CommenterWithStats, CommenterProfile } from '@/lib/types/commenter';

type Props = {
  commenters: CommenterWithStats[];
  siteId: string;
};

type ConfirmAction = 'deleteAll' | 'ban' | null;

export function UsersTable({ commenters, siteId }: Props) {
  const [profileUser, setProfileUser] = useState<CommenterProfile | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmTarget, setConfirmTarget] = useState<CommenterWithStats | null>(null);

  const {
    data: optimisticCommenters,
    updateItem,
    revertItem,
    setBusy,
    isBusy,
  } = useOptimisticState<CommenterWithStats>(commenters);

  function openConfirm(action: ConfirmAction, commenter: CommenterWithStats) {
    setConfirmAction(action);
    setConfirmTarget(commenter);
  }

  function closeConfirm() {
    setConfirmAction(null);
    setConfirmTarget(null);
  }

  async function handleDeleteAll() {
    if (!confirmTarget) return;
    const commenterId = confirmTarget.id;
    const original = optimisticCommenters.find((c) => c.id === commenterId);
    if (!original) return;

    updateItem((c) => c.id === commenterId, {
      deletedCount: original.totalCount - original.spamCount,
    });
    setBusy(commenterId, true);
    closeConfirm();

    try {
      await deleteAllCommentsByCommenter(siteId, commenterId);
      toast.success('All comments deleted');
    } catch {
      revertItem((c) => c.id === commenterId, original);
      toast.error('Failed to delete comments');
    } finally {
      setBusy(commenterId, false);
    }
  }

  async function handleBan() {
    if (!confirmTarget) return;
    const commenterId = confirmTarget.id;
    const original = optimisticCommenters.find((c) => c.id === commenterId);
    if (!original) return;

    updateItem((c) => c.id === commenterId, {
      isBanned: true,
      deletedCount: original.totalCount - original.spamCount,
    });
    setBusy(commenterId, true);
    closeConfirm();

    try {
      await banCommenter(siteId, commenterId);
      toast.success('User banned');
    } catch (err) {
      revertItem((c) => c.id === commenterId, original);
      toast.error('Failed to ban user');
    } finally {
      setBusy(commenterId, false);
    }
  }

  async function handleUnban(commenterId: string) {
    const original = optimisticCommenters.find((c) => c.id === commenterId);
    if (!original) return;

    updateItem((c) => c.id === commenterId, {
      isBanned: false,
    });
    setBusy(commenterId, true);

    try {
      await unbanCommenter(siteId, commenterId);
      toast.success('Ban removed');
    } catch (err) {
      revertItem((c) => c.id === commenterId, original);
      toast.error('Failed to remove ban');
    } finally {
      setBusy(commenterId, false);
    }
  }

  if (optimisticCommenters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">No users found</p>
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
              <TableHead>Total</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead>Spam</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticCommenters.map((commenter) => (
              <TableRow
                key={commenter.id}
                className="cursor-pointer"
                onClick={() => setProfileUser(commenter)}
              >
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={commenter.image ?? ''} />
                      <AvatarFallback className="text-xs">
                        {commenter.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{commenter.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {commenter.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{commenter.totalCount}</TableCell>
                <TableCell className="tabular-nums">{commenter.deletedCount}</TableCell>
                <TableCell className="tabular-nums">{commenter.spamCount}</TableCell>
                <TableCell>
                  {commenter.isBanned && (
                    <Badge variant="destructive">Banned</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={isBusy(commenter.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Actions for ${commenter.name}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setProfileUser(commenter)}>
                        <Eye className="mr-2 size-4" />
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfirm('deleteAll', commenter);
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete all comments
                      </DropdownMenuItem>
                      {!commenter.isBanned ? (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openConfirm('ban', commenter);
                          }}
                        >
                          <ShieldAlert className="mr-2 size-4" />
                          Ban user
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnban(commenter.id);
                          }}
                        >
                          <ShieldAlert className="mr-2 size-4 text-muted-foreground" />
                          Remove Ban
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserProfileDialog
        open={!!profileUser}
        onClose={() => setProfileUser(null)}
        commenter={profileUser}
        siteId={siteId}
      />

      {/* Delete All Comments Confirmation */}
      <Dialog open={confirmAction === 'deleteAll'} onOpenChange={(v) => !v && closeConfirm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all comments?</DialogTitle>
            <DialogDescription>
              This will permanently soft-delete all {confirmTarget?.totalCount} comments by {confirmTarget?.name} on this site.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isBusy(confirmTarget?.id ?? '')}
              onClick={handleDeleteAll}
            >
              Delete all
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban User Confirmation */}
      <Dialog open={confirmAction === 'ban'} onOpenChange={(v) => !v && closeConfirm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {confirmTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will ban {confirmTarget?.name} from this site and soft-delete all their {confirmTarget?.totalCount} comments.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isBusy(confirmTarget?.id ?? '')}
              onClick={handleBan}
            >
              Ban user
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
