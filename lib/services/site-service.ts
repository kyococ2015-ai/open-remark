import { db } from "@/lib/db";
import { ApiError } from "@/lib/api/error";
import type { CreateSiteInput, UpdateSiteInput } from "@/lib/validators/site";

export async function getSitesByOwner(ownerId: string) {
  return db.site.findMany({
    where: { ownerId },
    include: { _count: { select: { pages: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSiteByIdForOwner(siteId: string, ownerId: string) {
  const site = await db.site.findFirst({ where: { id: siteId, ownerId } });
  if (!site) throw new ApiError("Site not found", 404);
  return site;
}

export async function getSiteBySiteKey(siteKey: string) {
  const site = await db.site.findUnique({ where: { siteKey } });
  if (!site) throw new ApiError("Site not found", 404);
  return site;
}

export async function createSite(ownerId: string, input: CreateSiteInput) {
  return db.site.create({
    data: {
      name: input.name,
      domain: input.domain,
      autoApprove: input.autoApprove,
      allowedOrigins: JSON.stringify(input.allowedOrigins),
      theme: input.theme,
      primaryColor: input.primaryColor,
      radius: input.radius,
      ownerId,
    },
  });
}

export async function updateSite(
  siteId: string,
  ownerId: string,
  input: UpdateSiteInput,
) {
  await getSiteByIdForOwner(siteId, ownerId);
  return db.site.update({
    where: { id: siteId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.domain && { domain: input.domain }),
      ...(typeof input.autoApprove === "boolean" && {
        autoApprove: input.autoApprove,
      }),
      ...(input.allowedOrigins && {
        allowedOrigins: JSON.stringify(input.allowedOrigins),
      }),
      ...(input.theme && { theme: input.theme }),
      ...(input.primaryColor && { primaryColor: input.primaryColor }),
      ...(typeof input.radius === "number" && { radius: input.radius }),
    },
  });
}

export async function deleteSite(siteId: string, ownerId: string) {
  await getSiteByIdForOwner(siteId, ownerId);
  await db.site.delete({ where: { id: siteId } });
}
