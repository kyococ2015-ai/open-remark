import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import { getCommentersBySite } from '@/lib/services/user-service';
import { jsonResponse, errorResponse } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return errorResponse('Unauthorized', 401);
  }

  const { siteId } = await params;

  try {
    await getSiteByIdForOwner(siteId, session.user.id as string);
  } catch {
    return errorResponse('Site not found', 404);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const search = searchParams.get('search') ?? undefined;

  const result = await getCommentersBySite(siteId, { page, limit: 20, search });

  return jsonResponse(result);
}
