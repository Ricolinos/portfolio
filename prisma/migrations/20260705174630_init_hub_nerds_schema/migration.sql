-- CreateEnum
CREATE TYPE "CloudProvider" AS ENUM ('GOOGLE_DRIVE', 'ONEDRIVE', 'GOOGLE_CALENDAR', 'DROPBOX', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectQuote" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "total" DECIMAL(12,2),
    "calculationData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProjectQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkdownExercise" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "MarkdownExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudIntegration" (
    "id" TEXT NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metaData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CloudIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "ProjectQuote_userId_idx" ON "ProjectQuote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MarkdownExercise_slug_key" ON "MarkdownExercise"("slug");

-- CreateIndex
CREATE INDEX "MarkdownExercise_userId_idx" ON "MarkdownExercise"("userId");

-- CreateIndex
CREATE INDEX "MediaFile_userId_idx" ON "MediaFile"("userId");

-- CreateIndex
CREATE INDEX "CloudIntegration_userId_idx" ON "CloudIntegration"("userId");

-- AddForeignKey
ALTER TABLE "ProjectQuote" ADD CONSTRAINT "ProjectQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkdownExercise" ADD CONSTRAINT "MarkdownExercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudIntegration" ADD CONSTRAINT "CloudIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
