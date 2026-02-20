-- AlterTable
ALTER TABLE `Refund` ADD COLUMN `creditNoteId` VARCHAR(191) NULL,
    ADD COLUMN `creditNoteNumber` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Refund_creditNoteId_idx` ON `Refund`(`creditNoteId`);
