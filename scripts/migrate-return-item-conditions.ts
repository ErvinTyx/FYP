/**
 * Data Migration Script: Migrate ReturnRequestItem statusBreakdown JSON to ReturnItemCondition table
 * 
 * Run with: npx tsx scripts/migrate-return-item-conditions.ts
 * 
 * This script:
 * 1. Reads all ReturnRequestItems with statusBreakdown or itemStatus data
 * 2. Creates corresponding ReturnItemCondition records
 * 3. Reports migration results
 */

// Load environment variables
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

interface StatusBreakdown {
  Good?: number;
  Damaged?: number;
  Replace?: number;
}

async function migrateReturnItemConditions() {
  console.log('Starting migration of ReturnRequestItem conditions...\n');

  try {
    // Fetch all return request items
    const items = await prisma.returnRequestItem.findMany({
      include: {
        conditions: true, // Check if already migrated
      },
    });

    console.log(`Found ${items.length} return request items to process.\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const item of items) {
      // Skip if already has conditions
      if (item.conditions && item.conditions.length > 0) {
        console.log(`  [SKIP] Item ${item.id} (${item.name}) - already has ${item.conditions.length} conditions`);
        skippedCount++;
        continue;
      }

      try {
        // Parse statusBreakdown JSON if exists
        const breakdown = item.statusBreakdown as StatusBreakdown | null;
        
        const conditionsToCreate: { status: string; quantity: number }[] = [];

        if (breakdown && typeof breakdown === 'object') {
          // Use statusBreakdown data
          if (breakdown.Good && breakdown.Good > 0) {
            conditionsToCreate.push({ status: 'Good', quantity: breakdown.Good });
          }
          if (breakdown.Damaged && breakdown.Damaged > 0) {
            conditionsToCreate.push({ status: 'Damaged', quantity: breakdown.Damaged });
          }
          if (breakdown.Replace && breakdown.Replace > 0) {
            conditionsToCreate.push({ status: 'Replace', quantity: breakdown.Replace });
          }
        } else if (item.itemStatus && item.quantityReturned > 0) {
          // Fallback to itemStatus if no breakdown
          conditionsToCreate.push({ 
            status: item.itemStatus, 
            quantity: item.quantityReturned 
          });
        }

        // Create conditions if we have any
        if (conditionsToCreate.length > 0) {
          await prisma.returnItemCondition.createMany({
            data: conditionsToCreate.map(c => ({
              returnRequestItemId: item.id,
              status: c.status,
              quantity: c.quantity,
            })),
          });

          console.log(`  [OK] Item ${item.id} (${item.name}) - created ${conditionsToCreate.length} conditions:`, 
            conditionsToCreate.map(c => `${c.status}:${c.quantity}`).join(', '));
          migratedCount++;
        } else {
          console.log(`  [SKIP] Item ${item.id} (${item.name}) - no condition data to migrate`);
          skippedCount++;
        }
      } catch (err) {
        console.error(`  [ERROR] Item ${item.id} (${item.name}):`, err);
        errorCount++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total items processed: ${items.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Skipped (already migrated or no data): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Verify migration
    const totalConditions = await prisma.returnItemCondition.count();
    console.log(`\nTotal ReturnItemCondition records in database: ${totalConditions}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateReturnItemConditions()
  .then(() => {
    console.log('\nMigration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
