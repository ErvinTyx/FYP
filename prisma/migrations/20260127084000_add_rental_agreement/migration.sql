/*
  Warnings:

  - You are about to drop the `deliveryrequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deliveryset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deliverysetitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `returnrequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `returnrequestitem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `deliveryset` DROP FOREIGN KEY `DeliverySet_deliveryRequestId_fkey`;

-- DropForeignKey
ALTER TABLE `deliverysetitem` DROP FOREIGN KEY `DeliverySetItem_deliverySetId_fkey`;

-- DropForeignKey
ALTER TABLE `returnrequestitem` DROP FOREIGN KEY `ReturnRequestItem_returnRequestId_fkey`;

-- DropTable
DROP TABLE `deliveryrequest`;

-- DropTable
DROP TABLE `deliveryset`;

-- DropTable
DROP TABLE `deliverysetitem`;

-- DropTable
DROP TABLE `returnrequest`;

-- DropTable
DROP TABLE `returnrequestitem`;

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
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `currentVersion` INTEGER NOT NULL DEFAULT 1,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RentalAgreement_agreementNumber_key`(`agreementNumber`),
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
    `agreementId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AgreementVersion` ADD CONSTRAINT `AgreementVersion_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
