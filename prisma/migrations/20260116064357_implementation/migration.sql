-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentItem` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventoryItem_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderNo` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `total` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesOrder_orderNo_key`(`orderNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillingInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNo` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `total` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BillingInvoice_invoiceNo_key`(`invoiceNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable for RFQ Module
CREATE TABLE `rFQ` (
    `id` VARCHAR(191) NOT NULL,
    `rfqNumber` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `projectName` VARCHAR(191) NOT NULL,
    `projectLocation` VARCHAR(191) NOT NULL,
    `requestedDate` DATETIME(3) NOT NULL,
    `requiredDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `totalAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` LONGTEXT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rFQ_rfqNumber_key`(`rfqNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable for RFQItem Module
CREATE TABLE `rFQItem` (
    `id` VARCHAR(191) NOT NULL,
    `rfqId` VARCHAR(191) NOT NULL,
    `setName` VARCHAR(191) NOT NULL DEFAULT 'Set 1',
    `deliverDate` DATETIME(3) NULL,
    `returnDate` DATETIME(3) NULL,
    `scaffoldingItemId` VARCHAR(191) NOT NULL,
    `scaffoldingItemName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `totalPrice` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rFQItem` ADD CONSTRAINT `rFQItem_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rFQ`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- CreateTable for Inspection Module - ConditionReport
CREATE TABLE `ConditionReport` (
    `id` VARCHAR(191) NOT NULL,
    `rcfNumber` VARCHAR(191) NOT NULL,
    `deliveryOrderNumber` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `returnedBy` VARCHAR(191) NULL,
    `returnDate` VARCHAR(191) NOT NULL,
    `inspectionDate` VARCHAR(191) NOT NULL,
    `inspectedBy` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `totalItemsInspected` INTEGER NOT NULL DEFAULT 0,
    `totalGood` INTEGER NOT NULL DEFAULT 0,
    `totalRepair` INTEGER NOT NULL DEFAULT 0,
    `totalWriteOff` INTEGER NOT NULL DEFAULT 0,
    `totalDamaged` INTEGER NOT NULL DEFAULT 0,
    `totalRepairCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ConditionReport_rcfNumber_key`(`rcfNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable for Inspection Module - InspectionItem
CREATE TABLE `InspectionItem` (
    `id` VARCHAR(191) NOT NULL,
    `conditionReportId` VARCHAR(191) NOT NULL,
    `scaffoldingItemId` VARCHAR(191) NOT NULL,
    `scaffoldingItemName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `quantityGood` INTEGER NOT NULL DEFAULT 0,
    `quantityRepair` INTEGER NOT NULL DEFAULT 0,
    `quantityWriteOff` INTEGER NOT NULL DEFAULT 0,
    `condition` VARCHAR(191) NOT NULL DEFAULT 'good',
    `damageDescription` TEXT NULL,
    `repairRequired` BOOLEAN NOT NULL DEFAULT false,
    `estimatedRepairCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `originalItemPrice` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `inspectionChecklist` LONGTEXT NULL,
    `images` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable for Inspection Module - DamageInvoice
CREATE TABLE `DamageInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `orpNumber` VARCHAR(191) NOT NULL,
    `invoiceDate` VARCHAR(191) NOT NULL,
    `vendor` VARCHAR(191) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `paidDate` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `createdFrom` VARCHAR(191) NOT NULL DEFAULT 'repair-slip',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DamageInvoice_invoiceNumber_key`(`invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable for Inspection Module - InvoiceItem
CREATE TABLE `InvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `damageInvoiceId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey for Inspection Module
ALTER TABLE `InspectionItem` ADD CONSTRAINT `InspectionItem_conditionReportId_fkey` FOREIGN KEY (`conditionReportId`) REFERENCES `ConditionReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for Inspection Module
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_damageInvoiceId_fkey` FOREIGN KEY (`damageInvoiceId`) REFERENCES `DamageInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;