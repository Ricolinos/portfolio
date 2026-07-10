-- AlterTable
ALTER TABLE "CollabProject" ADD COLUMN     "quoteAmount" DECIMAL(12,2),
ADD COLUMN     "quoteCurrency" TEXT NOT NULL DEFAULT 'MXN',
ADD COLUMN     "quoteNotes" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "dueDate" TIMESTAMP(3);
