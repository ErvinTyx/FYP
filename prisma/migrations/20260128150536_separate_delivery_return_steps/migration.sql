/*
  Warnings:

  - You are about to drop the `inventoryitem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `inventoryitem`;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `customerType` VARCHAR(191) NOT NULL,
    `tin` VARCHAR(191) NOT NULL,
    `idType` VARCHAR(191) NOT NULL,
    `idNumber` VARCHAR(191) NULL,
    `identityDocumentUrl` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryItem` (
    `categoryId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`categoryId`, `itemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Item` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `pricePerDayPc` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `pricePerItem` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `replacementPerItem` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Available',
    `quantityAvailable` INTEGER NOT NULL DEFAULT 0,
    `quantityTotal` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VariationType` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VariationTypeOption` (
    `id` VARCHAR(191) NOT NULL,
    `variationTypeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariation` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `variationTypeOptionId` VARCHAR(191) NOT NULL,
    `pricePerDayPc` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `pricePerItem` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `replacementPerItem` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Available',
    `quantityAvailable` INTEGER NOT NULL DEFAULT 0,
    `quantityTotal` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `agreementNo` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `deliveryAddress` VARCHAR(191) NOT NULL,
    `deliveryType` VARCHAR(191) NOT NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalSets` INTEGER NOT NULL DEFAULT 0,
    `deliveredSets` INTEGER NOT NULL DEFAULT 0,
    `pickupTime` VARCHAR(191) NULL,
    `rfqId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryRequest_requestId_key`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliverySet` (
    `id` VARCHAR(191) NOT NULL,
    `setName` VARCHAR(191) NOT NULL,
    `scheduledPeriod` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `quotedAmount` DECIMAL(65, 30) NULL,
    `deliveryFee` DECIMAL(65, 30) NULL,
    `deliveryRequestId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryPackingList` (
    `id` VARCHAR(191) NOT NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,
    `packingListNumber` VARCHAR(191) NULL,
    `packingListDate` DATETIME(3) NULL,
    `issuedBy` VARCHAR(191) NULL,
    `issuedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryPackingList_deliverySetId_key`(`deliverySetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryStockCheck` (
    `id` VARCHAR(191) NOT NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,
    `checkDate` DATETIME(3) NULL,
    `checkedBy` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `allItemsAvailable` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryStockCheck_deliverySetId_key`(`deliverySetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliverySchedule` (
    `id` VARCHAR(191) NOT NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,
    `scheduledDate` DATETIME(3) NULL,
    `scheduledTimeSlot` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `confirmedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliverySchedule_deliverySetId_key`(`deliverySetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryPackingLoading` (
    `id` VARCHAR(191) NOT NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,
    `packingStartedAt` DATETIME(3) NULL,
    `packingStartedBy` VARCHAR(191) NULL,
    `loadingCompletedAt` DATETIME(3) NULL,
    `loadingCompletedBy` VARCHAR(191) NULL,
    `packingPhotos` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryPackingLoading_deliverySetId_key`(`deliverySetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryDispatch` (
    `id` VARCHAR(191) NOT NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,
    `driverName` VARCHAR(191) NULL,
    `driverContact` VARCHAR(191) NULL,
    `vehicleNumber` VARCHAR(191) NULL,
    `driverSignature` VARCHAR(191) NULL,
    `driverAcknowledgedAt` DATETIME(3) NULL,
    `dispatchedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryDispatch_deliverySetId_key`(`deliverySetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryDOIssued` (
    `id` VARCHAR(191) NOT NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,
    `doNumber` VARCHAR(191) NULL,
    `doIssuedAt` DATETIME(3) NULL,
    `doIssuedBy` VARCHAR(191) NULL,
    `signedDO` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryDOIssued_deliverySetId_key`(`deliverySetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryCompletion` (
    `id` VARCHAR(191) NOT NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,
    `deliveredAt` DATETIME(3) NULL,
    `deliveryPhotos` JSON NULL,
    `deliveredBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryCompletion_deliverySetId_key`(`deliverySetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryCustomerAck` (
    `id` VARCHAR(191) NOT NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,
    `customerAcknowledgedAt` DATETIME(3) NULL,
    `customerSignature` VARCHAR(191) NULL,
    `customerSignedBy` VARCHAR(191) NULL,
    `customerOTP` VARCHAR(191) NULL,
    `verifiedOTP` BOOLEAN NULL,
    `inventoryUpdatedAt` DATETIME(3) NULL,
    `inventoryStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryCustomerAck_deliverySetId_key`(`deliverySetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliverySetItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `scaffoldingItemId` VARCHAR(191) NULL,
    `deliverySetId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `agreementNo` VARCHAR(191) NOT NULL,
    `setName` VARCHAR(191) NOT NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'Requested',
    `reason` VARCHAR(191) NOT NULL,
    `pickupAddress` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `pickupFee` DECIMAL(65, 30) NULL,
    `returnType` VARCHAR(191) NOT NULL,
    `collectionMethod` VARCHAR(191) NOT NULL,
    `rfqId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnRequest_requestId_key`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnRequestItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `quantityReturned` INTEGER NOT NULL DEFAULT 0,
    `itemStatus` VARCHAR(191) NOT NULL DEFAULT 'Good',
    `statusBreakdown` JSON NULL,
    `notes` VARCHAR(191) NULL,
    `scaffoldingItemId` VARCHAR(191) NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `scheduledDate` DATETIME(3) NULL,
    `timeSlot` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnSchedule_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnPickupConfirm` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `pickupDriver` VARCHAR(191) NULL,
    `driverContact` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `confirmedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnPickupConfirm_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnDriverRecording` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `driverPhotos` JSON NULL,
    `recordedAt` DATETIME(3) NULL,
    `recordedBy` VARCHAR(191) NULL,
    `inTransitAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnDriverRecording_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnWarehouseReceipt` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `warehousePhotos` JSON NULL,
    `receivedAt` DATETIME(3) NULL,
    `receivedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnWarehouseReceipt_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnInspection` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `grnNumber` VARCHAR(191) NULL,
    `inspectedAt` DATETIME(3) NULL,
    `inspectedBy` VARCHAR(191) NULL,
    `productionNotes` VARCHAR(191) NULL,
    `hasExternalGoods` BOOLEAN NOT NULL DEFAULT false,
    `externalGoodsNotes` VARCHAR(191) NULL,
    `damagePhotos` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnInspection_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnRCF` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `rcfNumber` VARCHAR(191) NULL,
    `generatedAt` DATETIME(3) NULL,
    `generatedBy` VARCHAR(191) NULL,
    `skipped` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnRCF_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnNotification` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `notificationSent` BOOLEAN NOT NULL DEFAULT false,
    `notifiedAt` DATETIME(3) NULL,
    `notifiedBy` VARCHAR(191) NULL,
    `disputeRaised` BOOLEAN NOT NULL DEFAULT false,
    `disputeDescription` VARCHAR(191) NULL,
    `disputeRaisedAt` DATETIME(3) NULL,
    `disputeResolved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnNotification_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnCompletion` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `inventoryUpdated` BOOLEAN NOT NULL DEFAULT false,
    `soaUpdated` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `completedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnCompletion_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScaffoldingItem` (
    `id` VARCHAR(191) NOT NULL,
    `itemCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `available` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Available',
    `location` VARCHAR(191) NULL,
    `itemStatus` VARCHAR(191) NOT NULL DEFAULT 'Available',
    `imageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ScaffoldingItem_itemCode_key`(`itemCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_id_fkey` FOREIGN KEY (`id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryItem` ADD CONSTRAINT `CategoryItem_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryItem` ADD CONSTRAINT `CategoryItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VariationType` ADD CONSTRAINT `VariationType_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VariationTypeOption` ADD CONSTRAINT `VariationTypeOption_variationTypeId_fkey` FOREIGN KEY (`variationTypeId`) REFERENCES `VariationType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariation` ADD CONSTRAINT `ProductVariation_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariation` ADD CONSTRAINT `ProductVariation_variationTypeOptionId_fkey` FOREIGN KEY (`variationTypeOptionId`) REFERENCES `VariationTypeOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryRequest` ADD CONSTRAINT `DeliveryRequest_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rFQ`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliverySet` ADD CONSTRAINT `DeliverySet_deliveryRequestId_fkey` FOREIGN KEY (`deliveryRequestId`) REFERENCES `DeliveryRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryPackingList` ADD CONSTRAINT `DeliveryPackingList_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryStockCheck` ADD CONSTRAINT `DeliveryStockCheck_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliverySchedule` ADD CONSTRAINT `DeliverySchedule_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryPackingLoading` ADD CONSTRAINT `DeliveryPackingLoading_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryDispatch` ADD CONSTRAINT `DeliveryDispatch_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryDOIssued` ADD CONSTRAINT `DeliveryDOIssued_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryCompletion` ADD CONSTRAINT `DeliveryCompletion_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryCustomerAck` ADD CONSTRAINT `DeliveryCustomerAck_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliverySetItem` ADD CONSTRAINT `DeliverySetItem_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rFQ`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequestItem` ADD CONSTRAINT `ReturnRequestItem_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnSchedule` ADD CONSTRAINT `ReturnSchedule_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnPickupConfirm` ADD CONSTRAINT `ReturnPickupConfirm_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnDriverRecording` ADD CONSTRAINT `ReturnDriverRecording_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnWarehouseReceipt` ADD CONSTRAINT `ReturnWarehouseReceipt_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnInspection` ADD CONSTRAINT `ReturnInspection_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRCF` ADD CONSTRAINT `ReturnRCF_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnNotification` ADD CONSTRAINT `ReturnNotification_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnCompletion` ADD CONSTRAINT `ReturnCompletion_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
