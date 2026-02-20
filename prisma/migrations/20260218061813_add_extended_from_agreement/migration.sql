-- AlterTable
ALTER TABLE `rentalagreement` ADD COLUMN `extendedFromAgreementId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `RentalAgreement` ADD CONSTRAINT `RentalAgreement_extendedFromAgreementId_fkey` FOREIGN KEY (`extendedFromAgreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
