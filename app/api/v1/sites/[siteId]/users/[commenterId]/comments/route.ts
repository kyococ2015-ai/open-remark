import { auth } from '@/lib/auth';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import { getCommentsByCommenterOnSite } from '@/lib/services/user-service';
import { jsonResponse, errorResponse } from '@/lib/api/response';

export async function GET(
  _request: Request,
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

  const comments = await getCommentsByCommenterOnSite(siteId, commenterId);
  return jsonResponse(comments);
}
