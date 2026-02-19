-- AlterTable
ALTER TABLE `CreditNote` ADD COLUMN `agreementId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CreditNoteApplication` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteId` VARCHAR(191) NOT NULL,
    `targetInvoiceType` VARCHAR(191) NOT NULL,
    `targetInvoiceId` VARCHAR(191) NOT NULL,
    `targetInvoiceNumber` VARCHAR(191) NOT NULL,
    `amountApplied` DECIMAL(15, 2) NOT NULL,
    `appliedBy` VARCHAR(191) NOT NULL,
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,

    INDEX `CreditNoteApplication_creditNoteId_idx`(`creditNoteId`),
    INDEX `CreditNoteApplication_targetInvoiceId_idx`(`targetInvoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CreditNoteApplication` ADD CONSTRAINT `CreditNoteApplication_creditNoteId_fkey` FOREIGN KEY (`creditNoteId`) REFERENCES `CreditNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
