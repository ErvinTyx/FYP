/*
  Warnings:

  - You are about to drop the column `itemStatus` on the `returnrequestitem` table. All the data in the column will be lost.
  - You are about to drop the column `statusBreakdown` on the `returnrequestitem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[returnRequestId]` on the table `ConditionReport` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `conditionreport` ADD COLUMN `returnRequestId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `returnrequestitem` DROP COLUMN `itemStatus`,
    DROP COLUMN `statusBreakdown`;

-- CreateTable
CREATE TABLE `ReturnItemCondition` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestItemId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnItemCondition_returnRequestItemId_status_key`(`returnRequestItemId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MonthlyRentalInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `deliveryRequestId` VARCHAR(191) NOT NULL,
    `agreementId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `billingMonth` INTEGER NOT NULL,
    `billingYear` INTEGER NOT NULL,
    `billingStartDate` DATETIME(3) NOT NULL,
    `billingEndDate` DATETIME(3) NOT NULL,
    `daysInPeriod` INTEGER NOT NULL,
    `baseAmount` DECIMAL(15, 2) NOT NULL,
    `overdueCharges` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending Payment',
    `dueDate` DATETIME(3) NOT NULL,
    `paymentProofUrl` VARCHAR(191) NULL,
    `paymentProofFileName` VARCHAR(191) NULL,
    `paymentProofUploadedAt` DATETIME(3) NULL,
    `paymentProofUploadedBy` VARCHAR(191) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `rejectedBy` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MonthlyRentalInvoice_invoiceNumber_key`(`invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MonthlyRentalInvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `scaffoldingItemId` VARCHAR(191) NOT NULL,
    `scaffoldingItemName` VARCHAR(191) NOT NULL,
    `quantityBilled` INTEGER NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `daysCharged` INTEGER NOT NULL,
    `lineTotal` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditNote` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteNumber` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `originalInvoice` VARCHAR(191) NOT NULL,
    `deliveryOrderId` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `reasonDescription` TEXT NULL,
    `date` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedBy` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,

    UNIQUE INDEX `CreditNote_creditNoteNumber_key`(`creditNoteNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditNoteItem` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `previousPrice` DECIMAL(15, 2) NOT NULL,
    `currentPrice` DECIMAL(15, 2) NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditNoteAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RFQNotification` (
    `id` VARCHAR(191) NOT NULL,
    `rfqId` VARCHAR(191) NOT NULL,
    `rfqNumber` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `changes` LONGTEXT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `read` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `ConditionReport_returnRequestId_key` ON `ConditionReport`(`returnRequestId`);

-- AddForeignKey
ALTER TABLE `ConditionReport` ADD CONSTRAINT `ConditionReport_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnItemCondition` ADD CONSTRAINT `ReturnItemCondition_returnRequestItemId_fkey` FOREIGN KEY (`returnRequestItemId`) REFERENCES `ReturnRequestItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyRentalInvoice` ADD CONSTRAINT `MonthlyRentalInvoice_deliveryRequestId_fkey` FOREIGN KEY (`deliveryRequestId`) REFERENCES `DeliveryRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyRentalInvoice` ADD CONSTRAINT `MonthlyRentalInvoice_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyRentalInvoiceItem` ADD CONSTRAINT `MonthlyRentalInvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `MonthlyRentalInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNoteItem` ADD CONSTRAINT `CreditNoteItem_creditNoteId_fkey` FOREIGN KEY (`creditNoteId`) REFERENCES `CreditNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNoteAttachment` ADD CONSTRAINT `CreditNoteAttachment_creditNoteId_fkey` FOREIGN KEY (`creditNoteId`) REFERENCES `CreditNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
