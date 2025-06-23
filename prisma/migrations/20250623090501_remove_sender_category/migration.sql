/*
  Warnings:

  - You are about to drop the column `actionRequired` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `SenderCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SenderCategory" DROP CONSTRAINT "SenderCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "SenderCategory" DROP CONSTRAINT "SenderCategory_userId_fkey";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "merchant" TEXT;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "merchant" TEXT;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "actionRequired",
ADD COLUMN     "parsedData" JSONB;

-- DropTable
DROP TABLE "SenderCategory";
