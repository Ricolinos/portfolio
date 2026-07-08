-- AlterTable
ALTER TABLE "MediaFile" ADD COLUMN     "data" TEXT;

-- AlterTable
ALTER TABLE "PortfolioPiece" ADD COLUMN     "caseStudy" TEXT,
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPiece_userId_slug_key" ON "PortfolioPiece"("userId", "slug");

