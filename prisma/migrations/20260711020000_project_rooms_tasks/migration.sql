-- AlterTable
ALTER TABLE "ProjectChannel" ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "restricted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ChannelMember" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CollabProject" ADD COLUMN     "projectType" TEXT,
ADD COLUMN     "projectSubtype" TEXT;

-- AlterTable
ALTER TABLE "ProjectAssetTask" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "deliverableUrl" TEXT;

-- AlterTable
ALTER TABLE "ProjectLink" ADD COLUMN     "subtype" TEXT,
ADD COLUMN     "assetTaskId" TEXT;

-- CreateTable
CREATE TABLE "AssetTaskAssignee" (
    "id" TEXT NOT NULL,
    "assetTaskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetTaskAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetTaskAssignee_assetTaskId_idx" ON "AssetTaskAssignee"("assetTaskId");

-- CreateIndex
CREATE INDEX "AssetTaskAssignee_userId_idx" ON "AssetTaskAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTaskAssignee_assetTaskId_userId_key" ON "AssetTaskAssignee"("assetTaskId", "userId");

-- CreateIndex
CREATE INDEX "ProjectLink_assetTaskId_idx" ON "ProjectLink"("assetTaskId");

-- AddForeignKey
ALTER TABLE "ProjectLink" ADD CONSTRAINT "ProjectLink_assetTaskId_fkey" FOREIGN KEY ("assetTaskId") REFERENCES "ProjectAssetTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTaskAssignee" ADD CONSTRAINT "AssetTaskAssignee_assetTaskId_fkey" FOREIGN KEY ("assetTaskId") REFERENCES "ProjectAssetTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTaskAssignee" ADD CONSTRAINT "AssetTaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: las salas con ChannelMember existentes (creadas antes de que
-- ChannelMember pudiera portar solo el flag isAdmin) eran restringidas bajo
-- la semántica implícita anterior; se preserva ese comportamiento.
UPDATE "ProjectChannel" SET "restricted" = true WHERE "id" IN (SELECT DISTINCT "channelId" FROM "ChannelMember");
