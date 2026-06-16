-- Backfill: every existing site's owner becomes a SITE_OWNER member.
INSERT INTO "SiteMember" ("id", "userId", "siteId", "role", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."ownerId", s."id", 'SITE_OWNER', NOW(), NOW()
FROM "Site" s
WHERE NOT EXISTS (
  SELECT 1 FROM "SiteMember" sm WHERE sm."userId" = s."ownerId" AND sm."siteId" = s."id"
);

-- Bootstrap: the earliest-registered user becomes PLATFORM_OWNER.
UPDATE "User"
SET "platformRole" = 'PLATFORM_OWNER'
WHERE "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
