import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import {
  banCommenterOnSite,
  unbanCommenterOnSite,
  deleteAllCommentsByCommenterOnSite,
} from '@/lib/services/user-service';
import { jsonResponse, errorResponse } from '@/lib/api/response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; commenterId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return errorResponse('Unauthorized', 401);
  }

  const { siteId, commenterId } = await params;

  try {
    await getSiteByIdForOwner(siteId, session.user.id as string);
  } catch {
    return errorResponse('Site not found', 404);
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
      return jsonResponse(result);
    }

    if (action === 'unban') {
      const result = await unbanCommenterOnSite(siteId, commenterId);
      return jsonResponse(result);
    }

    if (action === 'deleteAll') {
      const result = await deleteAllCommentsByCommenterOnSite(
        siteId,
        commenterId,
        session.user.email,
      );
      return jsonResponse(result);
    }

    return errorResponse('Invalid action', 400);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already banned')) {
      return errorResponse(err.message, 409);
    }
    return errorResponse('Action failed', 500);
  }
}
