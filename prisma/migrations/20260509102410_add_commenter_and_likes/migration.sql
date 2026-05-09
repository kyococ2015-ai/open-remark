/*
  Warnings:

  - You are about to drop the column `authorEmail` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `authorImage` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `authorName` on the `Comment` table. All the data in the column will be lost.
  - Added the required column `commenterId` to the `Comment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Comment_authorEmail_idx";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "authorEmail",
DROP COLUMN "authorImage",
DROP COLUMN "authorName",
ADD COLUMN     "commenterId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Commenter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commenter_email_key" ON "Commenter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Commenter_username_key" ON "Commenter"("username");

-- CreateIndex
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentLike_commentId_userEmail_key" ON "CommentLike"("commentId", "userEmail");

-- CreateIndex
CREATE INDEX "Comment_commenterId_idx" ON "Comment"("commenterId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_commenterId_fkey" FOREIGN KEY ("commenterId") REFERENCES "Commenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
