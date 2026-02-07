-- AlterTable
ALTER TABLE `ScaffoldingDamageRepair` ADD COLUMN `costPerUnit` DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill: set costPerUnit to the single non-zero value (repairChargePerUnit or partsLabourCostPerUnit)
UPDATE `ScaffoldingDamageRepair`
SET `costPerUnit` = CASE
  WHEN `repairChargePerUnit` <> 0 THEN `repairChargePerUnit`
  ELSE `partsLabourCostPerUnit`
END;
