-- AlterTable
ALTER TABLE `rFQItem` ADD COLUMN `durationDays` INTEGER NULL,
ADD COLUMN `subtotalPrice` DECIMAL(15, 2) NULL;

-- Backfill: set durationDays and subtotalPrice where deliverDate and returnDate are set
UPDATE `rFQItem`
SET
  `durationDays` = GREATEST(1, CEIL(DATEDIFF(`returnDate`, `deliverDate`))),
  `subtotalPrice` = GREATEST(1, CEIL(DATEDIFF(`returnDate`, `deliverDate`))) * `totalPrice`
WHERE `deliverDate` IS NOT NULL AND `returnDate` IS NOT NULL AND DATEDIFF(`returnDate`, `deliverDate`) >= 0;
