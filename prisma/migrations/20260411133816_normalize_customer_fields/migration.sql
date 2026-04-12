/*
  Warnings:

  - You are about to drop the column `customerName` on the `AdditionalCharge` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `ConditionReport` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `CreditNote` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `CreditNoteItem` table. All the data in the column will be lost.
  - You are about to drop the column `customerOTP` on the `DeliveryCustomerAck` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryStatus` on the `DeliveryCustomerAck` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryUpdatedAt` on the `DeliveryCustomerAck` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedOTP` on the `DeliveryCustomerAck` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `DeliveryRequest` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `DeliveryRequest` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `DeliveryRequest` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `MonthlyRentalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `MonthlyRentalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `MonthlyRentalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `hirerPhone` on the `RentalAgreement` table. All the data in the column will be lost.
  - You are about to drop the column `costPerUnit` on the `RepairItem` table. All the data in the column will be lost.
  - You are about to drop the column `repairActions` on the `RepairItem` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ScaffoldingItem` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `rFQ` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `rFQ` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `rFQ` table. All the data in the column will be lost.
  - Added the required column `customerId` to the `rFQ` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `AdditionalCharge` DROP COLUMN `customerName`,
    ADD COLUMN `customerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ConditionReport` DROP COLUMN `customerName`,
    ADD COLUMN `customerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CreditNote` DROP COLUMN `customerName`,
    MODIFY `customerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CreditNoteItem` DROP COLUMN `unitPrice`;

-- AlterTable
ALTER TABLE `DeliveryCustomerAck` DROP COLUMN `customerOTP`,
    DROP COLUMN `inventoryStatus`,
    DROP COLUMN `inventoryUpdatedAt`,
    DROP COLUMN `verifiedOTP`;

-- AlterTable
ALTER TABLE `DeliveryRequest` DROP COLUMN `customerEmail`,
    DROP COLUMN `customerName`,
    DROP COLUMN `customerPhone`,
    ADD COLUMN `customerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `MonthlyRentalInvoice` DROP COLUMN `customerEmail`,
    DROP COLUMN `customerName`,
    DROP COLUMN `customerPhone`,
    ADD COLUMN `customerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Refund` DROP COLUMN `customerName`,
    MODIFY `customerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `RentalAgreement` DROP COLUMN `hirerPhone`,
    ADD COLUMN `customerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `RepairItem` DROP COLUMN `costPerUnit`,
    DROP COLUMN `repairActions`;

-- AlterTable
ALTER TABLE `ReturnRequest` DROP COLUMN `customerEmail`,
    DROP COLUMN `customerName`,
    DROP COLUMN `customerPhone`,
    ADD COLUMN `customerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ScaffoldingItem` DROP COLUMN `status`;

-- AlterTable
ALTER TABLE `rFQ` DROP COLUMN `customerEmail`,
    DROP COLUMN `customerName`,
    DROP COLUMN `customerPhone`,
    ADD COLUMN `customerId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `AdditionalCharge_customerId_idx` ON `AdditionalCharge`(`customerId`);

-- CreateIndex
CREATE INDEX `ConditionReport_customerId_idx` ON `ConditionReport`(`customerId`);

-- CreateIndex
CREATE INDEX `CreditNote_customerId_idx` ON `CreditNote`(`customerId`);

-- CreateIndex
CREATE INDEX `DeliveryRequest_customerId_idx` ON `DeliveryRequest`(`customerId`);

-- CreateIndex
CREATE INDEX `MonthlyRentalInvoice_customerId_idx` ON `MonthlyRentalInvoice`(`customerId`);

-- CreateIndex
CREATE INDEX `Refund_customerId_idx` ON `Refund`(`customerId`);

-- CreateIndex
CREATE INDEX `RentalAgreement_customerId_idx` ON `RentalAgreement`(`customerId`);

-- CreateIndex
CREATE INDEX `ReturnRequest_customerId_idx` ON `ReturnRequest`(`customerId`);

-- CreateIndex
CREATE INDEX `rFQ_customerId_idx` ON `rFQ`(`customerId`);

-- AddForeignKey
ALTER TABLE `rFQ` ADD CONSTRAINT `rFQ_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConditionReport` ADD CONSTRAINT `ConditionReport_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdditionalCharge` ADD CONSTRAINT `AdditionalCharge_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RentalAgreement` ADD CONSTRAINT `RentalAgreement_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryRequest` ADD CONSTRAINT `DeliveryRequest_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyRentalInvoice` ADD CONSTRAINT `MonthlyRentalInvoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
