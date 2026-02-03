-- CreateTable
CREATE TABLE `AdditionalCharge` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNo` VARCHAR(191) NOT NULL,
    `openRepairSlipId` VARCHAR(191) NULL,
    `conditionReportId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `doId` VARCHAR(191) NOT NULL,
    `returnedDate` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending_payment',
    `totalCharges` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `proofOfPaymentUrl` TEXT NULL,
    `referenceId` TEXT NULL,
    `rejectionReason` TEXT NULL,
    `approvalDate` DATETIME(3) NULL,
    `rejectionDate` DATETIME(3) NULL,
    `uploadedByEmail` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdditionalCharge_invoiceNo_key`(`invoiceNo`),
    UNIQUE INDEX `AdditionalCharge_openRepairSlipId_key`(`openRepairSlipId`),
    INDEX `AdditionalCharge_openRepairSlipId_idx`(`openRepairSlipId`),
    INDEX `AdditionalCharge_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdditionalChargeItem` (
    `id` VARCHAR(191) NOT NULL,
    `additionalChargeId` VARCHAR(191) NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `itemType` VARCHAR(191) NOT NULL,
    `repairDescription` TEXT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdditionalChargeItem_additionalChargeId_idx`(`additionalChargeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdditionalCharge` ADD CONSTRAINT `AdditionalCharge_openRepairSlipId_fkey` FOREIGN KEY (`openRepairSlipId`) REFERENCES `OpenRepairSlip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdditionalChargeItem` ADD CONSTRAINT `AdditionalChargeItem_additionalChargeId_fkey` FOREIGN KEY (`additionalChargeId`) REFERENCES `AdditionalCharge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
