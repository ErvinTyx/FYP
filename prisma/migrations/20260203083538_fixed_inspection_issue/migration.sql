/*
  Warnings:

  - You are about to drop the `billinginvoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categoryitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contentitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productvariation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reportdefinition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `salesorder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `variationtype` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `variationtypeoption` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `categoryitem` DROP FOREIGN KEY `CategoryItem_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `categoryitem` DROP FOREIGN KEY `CategoryItem_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `productvariation` DROP FOREIGN KEY `ProductVariation_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `productvariation` DROP FOREIGN KEY `ProductVariation_variationTypeOptionId_fkey`;

-- DropForeignKey
ALTER TABLE `variationtype` DROP FOREIGN KEY `VariationType_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `variationtypeoption` DROP FOREIGN KEY `VariationTypeOption_variationTypeId_fkey`;

-- DropTable
DROP TABLE `billinginvoice`;

-- DropTable
DROP TABLE `category`;

-- DropTable
DROP TABLE `categoryitem`;

-- DropTable
DROP TABLE `contentitem`;

-- DropTable
DROP TABLE `item`;

-- DropTable
DROP TABLE `productvariation`;

-- DropTable
DROP TABLE `reportdefinition`;

-- DropTable
DROP TABLE `salesorder`;

-- DropTable
DROP TABLE `variationtype`;

-- DropTable
DROP TABLE `variationtypeoption`;
