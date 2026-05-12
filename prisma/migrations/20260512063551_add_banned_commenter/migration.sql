-- CreateTable
CREATE TABLE "BannedCommenter" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "commenterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BannedCommenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BannedCommenter_siteId_idx" ON "BannedCommenter"("siteId");

-- CreateIndex
CREATE INDEX "BannedCommenter_commenterId_idx" ON "BannedCommenter"("commenterId");

-- CreateIndex
CREATE UNIQUE INDEX "BannedCommenter_siteId_commenterId_key" ON "BannedCommenter"("siteId", "commenterId");

-- AddForeignKey
ALTER TABLE "BannedCommenter" ADD CONSTRAINT "BannedCommenter_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannedCommenter" ADD CONSTRAINT "BannedCommenter_commenterId_fkey" FOREIGN KEY ("commenterId") REFERENCES "Commenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
