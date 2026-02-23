/*
  Warnings:

  - You are about to drop the column `tax` on the `damageinvoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `DamageInvoice` DROP COLUMN `tax`;

-- CreateTable
CREATE TABLE `ProjectFinancialReport` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `project_start_date` DATETIME(3) NOT NULL,
    `project_end_date` DATETIME(3) NOT NULL,
    `total_rental_revenue` DECIMAL(15, 2) NOT NULL,
    `total_repair_cost` DECIMAL(15, 2) NOT NULL,
    `total_damage_cost` DECIMAL(15, 2) NOT NULL,
    `transportation_cost` DECIMAL(15, 2) NOT NULL,
    `net_profit` DECIMAL(15, 2) NOT NULL,
    `profit_margin` DECIMAL(5, 2) NOT NULL,

    INDEX `ProjectFinancialReport_project_id_idx`(`project_id`),
    INDEX `ProjectFinancialReport_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerRentalBehaviour` (
    `id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `industry_type` VARCHAR(191) NOT NULL,
    `total_projects` INTEGER NOT NULL,
    `total_rental_value` DECIMAL(15, 2) NOT NULL,
    `rental_frequency` VARCHAR(191) NOT NULL,
    `last_rental_date` DATETIME(3) NULL,

    INDEX `CustomerRentalBehaviour_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryUtilizationReport` (
    `id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `total_quantity` INTEGER NOT NULL,
    `rented_quantity` INTEGER NOT NULL,
    `utilization_rate` DECIMAL(5, 2) NOT NULL,
    `idle_days` INTEGER NOT NULL,

    INDEX `InventoryUtilizationReport_item_id_idx`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaintenanceRecord` (
    `id` VARCHAR(191) NOT NULL,
    `repair_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `damage_type` VARCHAR(191) NOT NULL,
    `repair_date` DATETIME(3) NOT NULL,
    `repair_cost` DECIMAL(15, 2) NOT NULL,
    `repair_status` VARCHAR(191) NOT NULL,
    `downtime_days` INTEGER NOT NULL,
    `technician` VARCHAR(191) NULL,

    INDEX `MaintenanceRecord_repair_id_idx`(`repair_id`),
    INDEX `MaintenanceRecord_item_id_idx`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryPerformance` (
    `id` VARCHAR(191) NOT NULL,
    `delivery_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `driver_id` VARCHAR(191) NOT NULL,
    `delivery_date` DATETIME(3) NOT NULL,
    `pickup_date` DATETIME(3) NOT NULL,
    `delay_days` INTEGER NOT NULL,
    `transportation_cost` DECIMAL(15, 2) NOT NULL,
    `delivery_status` VARCHAR(191) NOT NULL,

    INDEX `DeliveryPerformance_delivery_id_idx`(`delivery_id`),
    INDEX `DeliveryPerformance_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RentalDuration` (
    `id` VARCHAR(191) NOT NULL,
    `rental_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `rental_start` DATETIME(3) NOT NULL,
    `rental_end` DATETIME(3) NOT NULL,
    `rental_days` INTEGER NOT NULL,
    `extension_days` INTEGER NOT NULL DEFAULT 0,
    `early_return` VARCHAR(191) NOT NULL,

    INDEX `RentalDuration_rental_id_idx`(`rental_id`),
    INDEX `RentalDuration_item_id_idx`(`item_id`),
    INDEX `RentalDuration_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerCreditRisk` (
    `id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `credit_limit` DECIMAL(15, 2) NOT NULL,
    `outstanding_balance` DECIMAL(15, 2) NOT NULL,
    `overdue_amount` DECIMAL(15, 2) NOT NULL,
    `aging_days` INTEGER NOT NULL,
    `risk_level` VARCHAR(191) NOT NULL,

    INDEX `CustomerCreditRisk_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
