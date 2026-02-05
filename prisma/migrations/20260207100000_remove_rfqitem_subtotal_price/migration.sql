-- AlterTable: remove subtotalPrice from rFQItem (monthlyRental now from sum of totalPrice)
ALTER TABLE `rFQItem` DROP COLUMN `subtotalPrice`;
