-- AlterTable: Add notificationsEnabled with default true
ALTER TABLE "Commenter" ADD COLUMN "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add notificationToken as nullable first, populate, then make unique
ALTER TABLE "Commenter" ADD COLUMN "notificationToken" TEXT;
UPDATE "Commenter" SET "notificationToken" = gen_random_uuid()::text WHERE "notificationToken" IS NULL;
ALTER TABLE "Commenter" ALTER COLUMN "notificationToken" SET NOT NULL;

-- CreateIndex: Unique constraint on notificationToken
CREATE UNIQUE INDEX "Commenter_notificationToken_key" ON "Commenter"("notificationToken");

-- AlterTable: Add email notification fields to Site
ALTER TABLE "Site" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Site" ADD COLUMN "emailSubjectPrefix" TEXT;
ALTER TABLE "Site" ADD COLUMN "emailLogoUrl" TEXT;
ALTER TABLE "Site" ADD COLUMN "emailAccentColor" TEXT;
ALTER TABLE "Site" ADD COLUMN "emailFooterText" TEXT;
