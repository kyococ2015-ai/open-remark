import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { CreateSiteSchema } from "@/lib/validators/site";
import { createSite, getSitesByOwner } from "@/lib/services/site-service";
import { handleApiError, ApiError } from "@/lib/api/error";
import { ok, created } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401);
    const sites = await getSitesByOwner(session.user.id);
    return ok(sites);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401);

    const body = await req.json();
    const parsed = CreateSiteSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const messages = [
        ...flat.formErrors,
        ...Object.values(flat.fieldErrors).flat(),
      ].filter(Boolean);
      return NextResponse.json(
        { error: messages.join("; ") || "Validation failed" },
        { status: 422 },
      );
    }

    const site = await createSite(session.user.id, parsed.data);
    return created(site);
  } catch (err) {
    return handleApiError(err);
  }
}
