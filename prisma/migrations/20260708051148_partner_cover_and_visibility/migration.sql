-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;
