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
    `deliveryDate` DATETIME(3) NULL,
    `packingListIssued` BOOLEAN NOT NULL DEFAULT false,
    `driverAcknowledged` BOOLEAN NOT NULL DEFAULT false,
    `customerAcknowledged` BOOLEAN NOT NULL DEFAULT false,
    `otp` VARCHAR(191) NULL,
    `signedDO` VARCHAR(191) NULL,
    `deliveryRequestId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliverySetItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
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
    `scheduledDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Requested',
    `reason` VARCHAR(191) NOT NULL,
    `pickupAddress` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `pickupFee` DECIMAL(65, 30) NULL,
    `returnType` VARCHAR(191) NOT NULL,
    `collectionMethod` VARCHAR(191) NOT NULL,
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
    `returnRequestId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DeliverySet` ADD CONSTRAINT `DeliverySet_deliveryRequestId_fkey` FOREIGN KEY (`deliveryRequestId`) REFERENCES `DeliveryRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliverySetItem` ADD CONSTRAINT `DeliverySetItem_deliverySetId_fkey` FOREIGN KEY (`deliverySetId`) REFERENCES `DeliverySet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequestItem` ADD CONSTRAINT `ReturnRequestItem_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
