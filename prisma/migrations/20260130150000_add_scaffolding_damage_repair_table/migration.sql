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

-- AddForeignKey
ALTER TABLE `ScaffoldingDamageRepair` ADD CONSTRAINT `ScaffoldingDamageRepair_scaffoldingItemId_fkey` FOREIGN KEY (`scaffoldingItemId`) REFERENCES `scaffoldingitem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (existing damageRepairs JSON data is not migrated - MariaDB does not support JSON_TABLE like MySQL 8)
ALTER TABLE `scaffoldingitem` DROP COLUMN `damageRepairs`;
