/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_USER');

-- CreateEnum
CREATE TYPE "SiteRole" AS ENUM ('SITE_OWNER', 'SITE_ADMIN', 'SITE_MODERATOR');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "platformRole" "PlatformRole" NOT NULL DEFAULT 'PLATFORM_USER';

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "SiteMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "role" "SiteRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteInvite" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SiteRole" NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteMember_userId_idx" ON "SiteMember"("userId");

-- CreateIndex
CREATE INDEX "SiteMember_siteId_role_idx" ON "SiteMember"("siteId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMember_userId_siteId_key" ON "SiteMember"("userId", "siteId");

-- CreateIndex
CREATE INDEX "SiteInvite_email_status_idx" ON "SiteInvite"("email", "status");

-- CreateIndex
CREATE INDEX "SiteInvite_siteId_idx" ON "SiteInvite"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteInvite_siteId_email_key" ON "SiteInvite"("siteId", "email");

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInvite" ADD CONSTRAINT "SiteInvite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
