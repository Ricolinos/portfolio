-- CreateTable
CREATE TABLE "PortfolioPiece" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "gallery" JSONB,
    "location" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PortfolioPiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioPiece_userId_idx" ON "PortfolioPiece"("userId");

-- CreateIndex
CREATE INDEX "PortfolioPiece_category_idx" ON "PortfolioPiece"("category");

-- AddForeignKey
ALTER TABLE "PortfolioPiece" ADD CONSTRAINT "PortfolioPiece_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
