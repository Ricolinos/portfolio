-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SHORTLIST', 'AWARDED', 'CANCELLED', 'BREACHED');

-- CreateEnum
CREATE TYPE "ContestApplicationStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EntryPlacement" AS ENUM ('WINNER', 'FINALIST', 'PARTICIPANT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CONTEST_SHORTLISTED';
ALTER TYPE "NotificationType" ADD VALUE 'CONTEST_AWARDED';

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" JSONB,
    "terms" JSONB,
    "projectType" TEXT,
    "projectSubtype" TEXT,
    "prizeAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "shortlistFee" DECIMAL(12,2) NOT NULL,
    "maxApplicants" INTEGER,
    "shortlistSize" INTEGER NOT NULL DEFAULT 5,
    "applyDeadline" TIMESTAMP(3) NOT NULL,
    "submitDeadline" TIMESTAMP(3) NOT NULL,
    "resultsDate" TIMESTAMP(3) NOT NULL,
    "rightsPolicy" TEXT,
    "status" "ContestStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "awardedProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestApplication" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "portfolioPieceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContestApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "contentBlocks" JSONB,
    "coverUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "placement" "EntryPlacement",
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contest_slug_key" ON "Contest"("slug");

-- CreateIndex
CREATE INDEX "Contest_clientId_idx" ON "Contest"("clientId");

-- CreateIndex
CREATE INDEX "Contest_status_applyDeadline_idx" ON "Contest"("status", "applyDeadline");

-- CreateIndex
CREATE INDEX "ContestApplication_partnerId_idx" ON "ContestApplication"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestApplication_contestId_partnerId_key" ON "ContestApplication"("contestId", "partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntry_applicationId_key" ON "ContestEntry"("applicationId");

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestApplication" ADD CONSTRAINT "ContestApplication_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestApplication" ADD CONSTRAINT "ContestApplication_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ContestApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
