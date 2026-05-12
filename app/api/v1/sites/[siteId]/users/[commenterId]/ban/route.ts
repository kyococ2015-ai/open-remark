import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import {
  banCommenterOnSite,
  unbanCommenterOnSite,
  deleteAllCommentsByCommenterOnSite,
} from '@/lib/services/user-service';
import { ok } from '@/lib/api/response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; commenterId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { siteId, commenterId } = await params;

  try {
    await getSiteByIdForOwner(siteId, session.user.id as string);
  } catch {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const body = await request.json();
  const action = body.action;

  try {
    if (action === 'ban') {
      const result = await banCommenterOnSite(
        siteId,
        commenterId,
        session.user.email,
      );
      return ok(result);
    }

    if (action === 'unban') {
      const result = await unbanCommenterOnSite(siteId, commenterId);
      return ok(result);
    }

    if (action === 'deleteAll') {
      const result = await deleteAllCommentsByCommenterOnSite(
        siteId,
        commenterId,
        session.user.email,
      );
      return ok(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message.includes('already banned')) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
