/*
  Warnings:

  - You are about to drop the column `requiredDate` on the `rfq` table. All the data in the column will be lost.
  - You are about to drop the column `deliverDate` on the `rfqitem` table. All the data in the column will be lost.
  - You are about to drop the column `durationDays` on the `rfqitem` table. All the data in the column will be lost.
  - You are about to drop the column `returnDate` on the `rfqitem` table. All the data in the column will be lost.
  - You are about to drop the column `subtotalPrice` on the `rfqitem` table. All the data in the column will be lost.
  - Added the required column `requiredDate` to the `rFQItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `rfq` DROP COLUMN `requiredDate`;

-- AlterTable
ALTER TABLE `rfqitem` DROP COLUMN `deliverDate`,
    DROP COLUMN `durationDays`,
    DROP COLUMN `returnDate`,
    ADD COLUMN `rentalMonths` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `requiredDate` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `rFQItem_scaffoldingItemId_idx` ON `rFQItem`(`scaffoldingItemId`);

-- RedefineIndex
CREATE INDEX `rFQItem_rfqId_idx` ON `rFQItem`(`rfqId`);
DROP INDEX `rFQItem_rfqId_fkey` ON `rfqitem`;
