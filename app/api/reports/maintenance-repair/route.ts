import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MaintenanceRecordRow, MaintenanceRecordResponse } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const repairItems = await prisma.repairItem.findMany({
      include: { openRepairSlip: true },
    });

    const data: MaintenanceRecordRow[] = repairItems.map((ri) => {
      const startDate = ri.openRepairSlip?.startDate ? new Date(ri.openRepairSlip.startDate) : null;
      const completedDate = ri.completedDate ? new Date(ri.completedDate) : null;
      const downtime_days = startDate && completedDate
        ? Math.ceil((completedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const repairDate = ri.completedDate ?? ri.openRepairSlip?.startDate ?? ri.createdAt;
      const repairDateStr = typeof repairDate === 'string' ? repairDate.split('T')[0] : new Date(repairDate).toISOString().split('T')[0];

      return {
        repair_id: ri.openRepairSlip?.orpNumber ?? ri.id,
        item_id: ri.scaffoldingItemId,
        damage_type: ri.damageType,
        repair_date: repairDateStr,
        repair_cost: Number(ri.totalCost ?? ri.finalCost ?? 0),
        repair_status: ri.repairStatus,
        downtime_days,
        technician: ri.openRepairSlip?.assignedTo ?? null,
      };
    });

    const totalRepairs = data.length;
    const totalCost = data.reduce((sum, r) => sum + r.repair_cost, 0);

    await prisma.$transaction([
      prisma.maintenanceRecord.deleteMany(),
      prisma.maintenanceRecord.createMany({
        data: data.map(r => ({
          repair_id: r.repair_id,
          item_id: r.item_id,
          damage_type: r.damage_type,
          repair_date: new Date(r.repair_date),
          repair_cost: r.repair_cost,
          repair_status: r.repair_status,
          downtime_days: r.downtime_days,
          technician: r.technician,
        })),
      }),
    ]);

    const stored = await prisma.maintenanceRecord.findMany();
    const responseData: MaintenanceRecordRow[] = stored.map(r => ({
      repair_id: r.repair_id,
      item_id: r.item_id,
      damage_type: r.damage_type,
      repair_date: r.repair_date.toISOString().split('T')[0],
      repair_cost: Number(r.repair_cost),
      repair_status: r.repair_status,
      downtime_days: r.downtime_days,
      technician: r.technician ?? null,
    }));

    return NextResponse.json({
      data: responseData,
      summary: { totalRepairs, totalCost },
    } satisfies MaintenanceRecordResponse);
  } catch (error) {
    console.error('Error fetching maintenance repair data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance repair data' },
      { status: 500 }
    );
  }
}
