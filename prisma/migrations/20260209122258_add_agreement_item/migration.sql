-- CreateTable
CREATE TABLE `AgreementItem` (
    `id` VARCHAR(191) NOT NULL,
    `agreementId` VARCHAR(191) NOT NULL,
    `rfqItemId` VARCHAR(191) NULL,
    `scaffoldingItemId` VARCHAR(191) NOT NULL,
    `scaffoldingItemName` VARCHAR(191) NOT NULL,
    `agreedMonthlyRate` DECIMAL(15, 2) NOT NULL,
    `minimumRentalMonths` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgreementItem_agreementId_idx`(`agreementId`),
    INDEX `AgreementItem_scaffoldingItemId_idx`(`scaffoldingItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AgreementItem` ADD CONSTRAINT `AgreementItem_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `RentalAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for unique constraint on MonthlyRentalInvoice
-- Note: This allows multiple NULL agreementId values (backward compatibility)
CREATE UNIQUE INDEX `MonthlyRentalInvoice_agreementId_billingMonth_billingYear_key` ON `MonthlyRentalInvoice`(`agreementId`, `billingMonth`, `billingYear`);

-- Data migration: Populate AgreementItem from existing RentalAgreement.rfqId → rFQ.items
INSERT INTO `AgreementItem` (
    `id`,
    `agreementId`,
    `rfqItemId`,
    `scaffoldingItemId`,
    `scaffoldingItemName`,
    `agreedMonthlyRate`,
    `minimumRentalMonths`,
    `createdAt`
)
SELECT 
    CONCAT('agr_item_', UUID()) as `id`,
    ra.`id` as `agreementId`,
    rfqi.`id` as `rfqItemId`,
    rfqi.`scaffoldingItemId`,
    rfqi.`scaffoldingItemName`,
    rfqi.`unitPrice` as `agreedMonthlyRate`,
    COALESCE(rfqi.`rentalMonths`, 1) as `minimumRentalMonths`,
    NOW() as `createdAt`
FROM `RentalAgreement` ra
JOIN `rFQ` rfq ON ra.`rfqId` = rfq.`id`
JOIN `rFQItem` rfqi ON rfq.`id` = rfqi.`rfqId`
WHERE ra.`rfqId` IS NOT NULL;
