-- AlterTable
ALTER TABLE `rfq` ADD COLUMN `extendedFromRfqId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `rFQ` ADD CONSTRAINT `rFQ_extendedFromRfqId_fkey` FOREIGN KEY (`extendedFromRfqId`) REFERENCES `rFQ`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
