-- CreateTable
CREATE TABLE `OpenRepairSlip` (
    `id` VARCHAR(191) NOT NULL,
    `orpNumber` VARCHAR(191) NOT NULL,
    `conditionReportId` VARCHAR(191) NOT NULL,
    `rcfNumber` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `assignedTo` VARCHAR(191) NULL,
    `startDate` VARCHAR(191) NULL,
    `completionDate` VARCHAR(191) NULL,
    `estimatedCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `actualCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `repairNotes` LONGTEXT NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `damageInvoiceId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `inventoryLevel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OpenRepairSlip_orpNumber_key`(`orpNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepairItem` (
    `id` VARCHAR(191) NOT NULL,
    `openRepairSlipId` VARCHAR(191) NOT NULL,
    `inspectionItemId` VARCHAR(191) NULL,
    `scaffoldingItemId` VARCHAR(191) NOT NULL,
    `scaffoldingItemName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `quantityRepaired` INTEGER NOT NULL DEFAULT 0,
    `quantityRemaining` INTEGER NOT NULL DEFAULT 0,
    `damageType` VARCHAR(191) NOT NULL,
    `damageDescription` TEXT NULL,
    `repairActions` LONGTEXT NULL,
    `repairDescription` TEXT NULL,
    `repairStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `costPerUnit` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `estimatedCostFromRFQ` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `finalCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `beforeImages` LONGTEXT NULL,
    `afterImages` LONGTEXT NULL,
    `completedDate` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryAdjustment` (
    `id` VARCHAR(191) NOT NULL,
    `adjustmentType` VARCHAR(191) NOT NULL,
    `conditionReportId` VARCHAR(191) NULL,
    `repairSlipId` VARCHAR(191) NULL,
    `scaffoldingItemId` VARCHAR(191) NOT NULL,
    `scaffoldingItemName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `fromStatus` VARCHAR(191) NOT NULL,
    `toStatus` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `referenceType` VARCHAR(191) NOT NULL,
    `adjustedBy` VARCHAR(191) NOT NULL,
    `adjustedAt` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RepairItem` ADD CONSTRAINT `RepairItem_openRepairSlipId_fkey` FOREIGN KEY (`openRepairSlipId`) REFERENCES `OpenRepairSlip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryAdjustment` ADD CONSTRAINT `InventoryAdjustment_conditionReportId_fkey` FOREIGN KEY (`conditionReportId`) REFERENCES `ConditionReport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryAdjustment` ADD CONSTRAINT `InventoryAdjustment_repairSlipId_fkey` FOREIGN KEY (`repairSlipId`) REFERENCES `OpenRepairSlip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
