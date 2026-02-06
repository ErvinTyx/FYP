-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
CREATE TABLE `VerificationCode` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordSetupToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordSetupToken_token_key`(`token`),
    INDEX `PasswordSetupToken_userId_fkey`(`userId`),
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

    INDEX `UserRole_roleId_fkey`(`roleId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentItem` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `imageUrl` TEXT NULL,
    `metadata` TEXT NULL,
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT 'System',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentItem_type_idx`(`type`),
    INDEX `ContentItem_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `rFQItem` (
    `id` VARCHAR(191) NOT NULL,
    `rfqId` VARCHAR(191) NOT NULL,
    `setName` VARCHAR(191) NOT NULL DEFAULT 'Set 1',
    `deliverDate` DATETIME(3) NULL,
    `returnDate` DATETIME(3) NULL,
    `durationDays` INTEGER NULL,
    `scaffoldingItemId` VARCHAR(191) NOT NULL,
    `scaffoldingItemName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `totalPrice` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rFQItem_rfqId_fkey`(`rfqId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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
    `returnRequestId` VARCHAR(191) NULL,

    UNIQUE INDEX `ConditionReport_rcfNumber_key`(`rcfNumber`),
    UNIQUE INDEX `ConditionReport_returnRequestId_key`(`returnRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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
    `quantityRepair` INTEGER NOT NULL DEFAULT 0,
    `quantityWriteOff` INTEGER NOT NULL DEFAULT 0,
    `quantityRepaired` INTEGER NOT NULL DEFAULT 0,
    `quantityRemaining` INTEGER NOT NULL DEFAULT 0,
    `damageType` VARCHAR(191) NOT NULL,
    `damageDescription` TEXT NULL,
    `repairActions` LONGTEXT NULL,
    `repairActionEntries` LONGTEXT NULL,
    `repairDescription` TEXT NULL,
    `repairStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `writeOffCostPerUnit` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `writeOffTotalCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalRepairCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
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

-- CreateTable
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

-- CreateTable
CREATE TABLE `AdditionalCharge` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNo` VARCHAR(191) NOT NULL,
    `openRepairSlipId` VARCHAR(191) NULL,
    `returnRequestId` VARCHAR(191) NULL,
    `deliverySetId` VARCHAR(191) NULL,
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
    UNIQUE INDEX `AdditionalCharge_returnRequestId_key`(`returnRequestId`),
    UNIQUE INDEX `AdditionalCharge_deliverySetId_key`(`deliverySetId`),
    INDEX `AdditionalCharge_openRepairSlipId_idx`(`openRepairSlipId`),
    INDEX `AdditionalCharge_returnRequestId_idx`(`returnRequestId`),
    INDEX `AdditionalCharge_deliverySetId_idx`(`deliverySetId`),
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

-- CreateTable
CREATE TABLE `RentalAgreement` (
    `id` VARCHAR(191) NOT NULL,
    `agreementNumber` VARCHAR(191) NOT NULL,
    `poNumber` VARCHAR(191) NULL,
    `projectName` VARCHAR(191) NOT NULL,
    `owner` VARCHAR(191) NOT NULL,
    `ownerPhone` VARCHAR(191) NULL,
    `hirer` VARCHAR(191) NOT NULL,
    `hirerPhone` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `termOfHire` VARCHAR(191) NULL,
    `transportation` VARCHAR(191) NULL,
    `monthlyRental` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `securityDeposit` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `minimumCharges` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `defaultInterest` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `ownerSignatoryName` VARCHAR(191) NULL,
    `ownerNRIC` VARCHAR(191) NULL,
    `hirerSignatoryName` VARCHAR(191) NULL,
    `hirerNRIC` VARCHAR(191) NULL,
    `ownerSignature` TEXT NULL,
    `hirerSignature` TEXT NULL,
    `ownerSignatureDate` DATETIME(3) NULL,
    `hirerSignatureDate` DATETIME(3) NULL,
    `signedDocumentUrl` VARCHAR(191) NULL,
    `signedDocumentUploadedAt` DATETIME(3) NULL,
    `signedDocumentUploadedBy` VARCHAR(191) NULL,
    `signedStatus` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `currentVersion` INTEGER NOT NULL DEFAULT 1,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `rfqId` VARCHAR(191) NULL,

    UNIQUE INDEX `RentalAgreement_agreementNumber_key`(`agreementNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectClosureRequest` (
    `id` VARCHAR(191) NOT NULL,
    `closureRequestNumber` VARCHAR(191) NOT NULL,
    `agreementId` VARCHAR(191) NOT NULL,
    `requestDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProjectClosureRequest_closureRequestNumber_key`(`closureRequestNumber`),
    INDEX `ProjectClosureRequest_agreementId_idx`(`agreementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgreementVersion` (
    `id` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `changes` VARCHAR(191) NULL,
    `allowedRoles` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `snapshot` JSON NULL,
    `agreementId` VARCHAR(191) NOT NULL,

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
    `driverSignature` TEXT NULL,
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
    `customerSignature` TEXT NULL,
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
    `notes` VARCHAR(191) NULL,
    `scaffoldingItemId` VARCHAR(191) NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `available` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `originPrice` DECIMAL(65, 30) NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Available',
    `location` VARCHAR(191) NULL,
    `itemStatus` VARCHAR(191) NOT NULL DEFAULT 'Available',
    `imageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ScaffoldingItem_itemCode_key`(`itemCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScaffoldingDamageRepair` (
    `id` VARCHAR(191) NOT NULL,
    `scaffoldingItemId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `repairChargePerUnit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `partsLabourCostPerUnit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ScaffoldingDamageRepair_scaffoldingItemId_idx`(`scaffoldingItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Deposit` (
    `id` VARCHAR(191) NOT NULL,
    `depositNumber` VARCHAR(191) NOT NULL,
    `agreementId` VARCHAR(191) NOT NULL,
    `depositAmount` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending Payment',
    `dueDate` DATETIME(3) NOT NULL,
    `paymentProofUrl` VARCHAR(191) NULL,
    `paymentProofFileName` VARCHAR(191) NULL,
    `paymentProofUploadedAt` DATETIME(3) NULL,
    `paymentProofUploadedBy` VARCHAR(191) NULL,
    `paymentSubmittedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `rejectedBy` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Deposit_depositNumber_key`(`depositNumber`),
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
    `invoiceType` VARCHAR(191) NOT NULL DEFAULT 'monthlyRental',
    `sourceId` VARCHAR(191) NULL,
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
    `daysCharged` INTEGER NULL,
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
CREATE TABLE `Refund` (
    `id` VARCHAR(191) NOT NULL,
    `refundNumber` VARCHAR(191) NOT NULL,
    `invoiceType` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `originalInvoice` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `refundMethod` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `reasonDescription` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedBy` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,

    UNIQUE INDEX `Refund_refundNumber_key`(`refundNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `refundId` VARCHAR(191) NOT NULL,
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

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_id_fkey` FOREIGN KEY (`id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordSetupToken` ADD CONSTRAINT `PasswordSetupToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rFQItem` ADD CONSTRAINT `rFQItem_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rFQ`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConditionReport` ADD CONSTRAINT `ConditionReport_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionItem` ADD CONSTRAINT `InspectionItem_conditionReportId_fkey` FOREIGN KEY (`conditionReportId`) REFERENCES `ConditionReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpenRepairSlip` ADD CONSTRAINT `OpenRepairSlip_conditionReportId_fkey` FOREIGN KEY (`conditionReportId`) REFERENCES `ConditionReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepairItem` ADD CONSTRAINT `RepairItem_openRepairSlipId_fkey` FOREIGN KEY (`openRepairSlipId`) REFERENCES `OpenRepairSlip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_damageInvoiceId_fkey` FOREIGN KEY (`damageInvoiceId`) REFERENCES `DamageInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryAdjustment` ADD CONSTRAINT `InventoryAdjustment_conditionReportId_fkey` FOREIGN KEY (`conditionReportId`) REFERENCES `ConditionReport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryAdjustment` ADD CONSTRAINT `InventoryAdjustment_repairSlipId_fkey` FOREIGN KEY (`repairSlipId`) REFERENCES `OpenRepairSlip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdditionalCharge` ADD CONSTRAINT `AdditionalCharge_openRepairSlipId_fkey` FOREIGN KEY (`openRepairSlipId`) REFERENCES `OpenRepairSlip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdditionalChargeItem` ADD CONSTRAINT `AdditionalChargeItem_additionalChargeId_fkey` FOREIGN KEY (`additionalChargeId`) REFERENCES `AdditionalCharge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RentalAgreement` ADD CONSTRAINT `RentalAgreement_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rFQ`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectClosureRequest` ADD CONSTRAINT `ProjectClosureRequest_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgreementVersion` ADD CONSTRAINT `AgreementVersion_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE `ReturnItemCondition` ADD CONSTRAINT `ReturnItemCondition_returnRequestItemId_fkey` FOREIGN KEY (`returnRequestItemId`) REFERENCES `ReturnRequestItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `ScaffoldingDamageRepair` ADD CONSTRAINT `ScaffoldingDamageRepair_scaffoldingItemId_fkey` FOREIGN KEY (`scaffoldingItemId`) REFERENCES `ScaffoldingItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deposit` ADD CONSTRAINT `Deposit_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `RefundAttachment` ADD CONSTRAINT `RefundAttachment_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `Refund`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
