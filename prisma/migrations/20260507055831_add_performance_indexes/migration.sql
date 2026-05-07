-- CreateIndex
CREATE INDEX "Comment_pageId_status_createdAt_idx" ON "Comment"("pageId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_authorEmail_idx" ON "Comment"("authorEmail");

-- CreateIndex
CREATE INDEX "Comment_status_createdAt_idx" ON "Comment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_commentId_createdAt_idx" ON "ModerationLog"("commentId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_adminEmail_createdAt_idx" ON "ModerationLog"("adminEmail", "createdAt");

-- CreateIndex
CREATE INDEX "Page_siteId_idx" ON "Page"("siteId");

-- CreateIndex
CREATE INDEX "Site_ownerId_idx" ON "Site"("ownerId");
