-- AddForeignKey
ALTER TABLE `OpenRepairSlip` ADD CONSTRAINT `OpenRepairSlip_conditionReportId_fkey` FOREIGN KEY (`conditionReportId`) REFERENCES `ConditionReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
