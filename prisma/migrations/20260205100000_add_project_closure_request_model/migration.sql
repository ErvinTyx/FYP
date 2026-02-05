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

-- AddForeignKey
ALTER TABLE `ProjectClosureRequest` ADD CONSTRAINT `ProjectClosureRequest_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: drop projectClosureRequestDate (added in 20260204100000). If that migration was not applied, comment out the next line.
ALTER TABLE `RentalAgreement` DROP COLUMN `projectClosureRequestDate`;
