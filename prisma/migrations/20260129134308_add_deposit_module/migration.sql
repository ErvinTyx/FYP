-- AlterTable
ALTER TABLE `rentalagreement` ADD COLUMN `rfqId` VARCHAR(191) NULL;

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

-- AddForeignKey
ALTER TABLE `RentalAgreement` ADD CONSTRAINT `RentalAgreement_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rFQ`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deposit` ADD CONSTRAINT `Deposit_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
