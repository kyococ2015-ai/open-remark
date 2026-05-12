'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { banCommenter, deleteAllCommentsByCommenter } from '@/lib/services/comment-client';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, ShieldAlert, Trash2, Eye } from 'lucide-react';
import { UserProfileDialog } from './user-profile-dialog';
import type { CommenterWithStats, CommenterProfile } from '@/lib/types/commenter';

type Props = {
  commenters: CommenterWithStats[];
  siteId: string;
};

export function UsersTable({ commenters, siteId }: Props) {
  const [profileUser, setProfileUser] = useState<CommenterProfile | null>(null);

  const {
    data: optimisticCommenters,
    updateItem,
    revertItem,
    setBusy,
    isBusy,
  } = useOptimisticState<CommenterWithStats>(commenters);

  async function handleDeleteAll(commenterId: string) {
    const original = optimisticCommenters.find((c) => c.id === commenterId);
    if (!original) return;

    updateItem((c) => c.id === commenterId, {
      deletedCount: original.totalCount - original.spamCount,
    });
    setBusy(commenterId, true);

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

  async function handleBan(commenterId: string) {
    const original = optimisticCommenters.find((c) => c.id === commenterId);
    if (!original) return;

    updateItem((c) => c.id === commenterId, {
      isBanned: true,
      deletedCount: original.totalCount - original.spamCount,
    });
    setBusy(commenterId, true);

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
                          handleDeleteAll(commenter.id);
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete all comments
                      </DropdownMenuItem>
                      {!commenter.isBanned && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBan(commenter.id);
                          }}
                        >
                          <ShieldAlert className="mr-2 size-4" />
                          Ban user
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
    </>
  );
}
