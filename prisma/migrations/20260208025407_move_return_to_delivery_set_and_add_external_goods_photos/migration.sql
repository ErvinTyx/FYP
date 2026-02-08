/*
  Warnings:

  - You are about to drop the column `rfqId` on the `returnrequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `ReturnRequest` DROP FOREIGN KEY `ReturnRequest_rfqId_fkey`;

-- DropIndex
DROP INDEX `ReturnRequest_rfqId_fkey` ON `ReturnRequest`;

-- AlterTable
ALTER TABLE `ReturnInspection` ADD COLUMN `externalGoodsPhotos` JSON NULL;

-- AlterTable
ALTER TABLE `ReturnRequest` DROP COLUMN `rfqId`,
    ADD COLUMN `deliverySetId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
