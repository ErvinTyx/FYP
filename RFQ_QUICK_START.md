/**
 * ============================================================
 * RFQ MODULE - QUICK START IMPLEMENTATION
 * ============================================================
 * 
 * Module: Request for Quotation (RFQ)
 * Quick Setup Time: ~15 minutes
 * 
 * This guide shows exactly what to do to make RFQ data
 * save to MySQL database.
 * 
 * ============================================================
 * QUICK START (3 SIMPLE STEPS)
 * ============================================================
 */

// STEP 1: ADD SCHEMA TO PRISMA
// ===============================
// File: prisma/schema.prisma
// Add this at the end of the file:

/*
model RFQ {
  id                String     @id @default(cuid())
  rfqNumber         String     @unique @index
  customerName      String     @index
  customerEmail     String     @index
  customerPhone     String
  projectName       String     @index
  projectLocation   String
  requestedDate     DateTime
  requiredDate      DateTime
  status            String     @default("draft") @index
  totalAmount       Decimal    @default(0) @db.Decimal(15, 2)
  notes             String?    @db.LongText
  createdBy         String     @index
  items             RFQItem[]
  createdAt         DateTime   @default(now()) @index
  updatedAt         DateTime   @updatedAt

  @@index([rfqNumber])
  @@index([status, createdAt])
}

model RFQItem {
  id                    String     @id @default(cuid())
  rfqId                 String     @index
  rfq                   RFQ        @relation(fields: [rfqId], references: [id], onDelete: Cascade)
  scaffoldingItemId     String
  scaffoldingItemName   String
  quantity              Int
  unit                  String
  unitPrice             Decimal    @db.Decimal(15, 2)
  totalPrice            Decimal    @db.Decimal(15, 2)
  notes                 String?    @db.Text
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  @@index([rfqId])
}
*/

// STEP 2: RUN MIGRATION (in terminal)
// ====================================
// npx prisma migrate dev --name add_rfq_tables

// STEP 3: UPDATE RFQForm COMPONENT
// =================================
// File: src/components/rfq/RFQForm.tsx

import { useState, useEffect } from 'react';
import { useRFQAPI } from '../../hooks/useRFQAPI';
import { toast } from 'sonner';

// ... existing imports ...

interface RFQFormProps {
  rfq: RFQ | null;
  onSave: (rfq: RFQ) => void;
  onCancel: () => void;
}

export function RFQForm({ rfq, onSave, onCancel }: RFQFormProps) {
  // ADD THIS LINE:
  const { createRFQ, updateRFQ, loading: apiLoading } = useRFQAPI();

  // ... existing state declarations ...

  // MODIFY THE SAVE/SUBMIT HANDLER:
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        projectName: formData.projectName,
        projectLocation: formData.projectLocation,
        requestedDate: formData.requestedDate,
        requiredDate: formData.requiredDate,
        status: formData.status,
        totalAmount: formData.totalAmount,
        notes: formData.notes,
        createdBy: 'Current User', // TODO: Get from auth context
        items: items.map(item => ({
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes
        }))
      };

      if (rfq?.id) {
        // UPDATE existing RFQ
        await updateRFQ(rfq.id, payload);
        toast.success('RFQ updated and saved to database!');
      } else {
        // CREATE new RFQ
        await createRFQ(payload);
        toast.success('RFQ created and saved to database!');
      }

      onSave(formData as any);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save RFQ';
      toast.error(errorMsg);
      console.error('Error saving RFQ:', error);
    }
  };

  // UPDATE YOUR SAVE BUTTON:
  // <button 
  //   disabled={apiLoading}
  //   onClick={handleSave}
  // >
  //   {apiLoading ? 'Saving...' : 'Save to Database'}
  // </button>

  // Return JSX... (rest of component remains the same)
}

// ============================================================
// THAT'S IT! YOUR RFQ DATA NOW SAVES TO MYSQL
// ============================================================

// Verify it worked:
// 1. Open phpMyAdmin
// 2. Go to database: power_metal_steel
// 3. Look for two new tables: RFQ and RFQItem
// 4. Create an RFQ in the app → Check the tables for data

// ============================================================
// WHAT EACH FILE DOES
// ============================================================

/**
 * src/services/rfq.service.ts
 * - Contains the core business logic
 * - Functions: createRFQ, getRFQById, updateRFQ, deleteRFQ, etc.
 * - Directly interacts with Prisma ORM and database
 * 
 * app/api/rfq/route.ts
 * - HTTP endpoint: POST /api/rfq (create)
 * - HTTP endpoint: GET /api/rfq (list all)
 * - Receives requests from frontend, calls service layer
 * 
 * app/api/rfq/[id]/route.ts
 * - HTTP endpoint: GET /api/rfq/{id} (get by id)
 * - HTTP endpoint: PUT /api/rfq/{id} (update)
 * - HTTP endpoint: DELETE /api/rfq/{id} (delete)
 * - Handles specific RFQ operations
 * 
 * src/hooks/useRFQAPI.ts
 * - React hook for components to use
 * - Wraps API calls in a nice interface
 * - Handles loading and error states
 * 
 * prisma/schema.prisma
 * - Defines database table structure
 * - RFQ model = database RFQ table
 * - RFQItem model = database RFQItem table
 */

// ============================================================
// API USAGE (FROM FRONTEND)
// ============================================================

// These API endpoints are now available:

/**
 * CREATE NEW RFQ
 * POST http://localhost:3000/api/rfq
 * Body: { customerName, customerEmail, projectName, ... items }
 * Returns: { success: true, data: RFQ }
 */

/**
 * GET ALL RFQs
 * GET http://localhost:3000/api/rfq?status=draft
 * Returns: { success: true, data: RFQ[] }
 */

/**
 * GET SPECIFIC RFQ
 * GET http://localhost:3000/api/rfq/abc123
 * Returns: { success: true, data: RFQ }
 */

/**
 * UPDATE RFQ
 * PUT http://localhost:3000/api/rfq/abc123
 * Body: { status, totalAmount, notes }
 * Returns: { success: true, data: RFQ }
 */

/**
 * DELETE RFQ
 * DELETE http://localhost:3000/api/rfq/abc123
 * Returns: { success: true, message: "RFQ deleted" }
 */

// ============================================================
// DATABASE RELATIONSHIPS
// ============================================================

/**
 * One RFQ has Many RFQItems
 * 
 * RFQ (1) ──┬──> (Many) RFQItem
 *           └── rfqId (Foreign Key)
 * 
 * When you delete an RFQ, all its RFQItems are deleted too
 * (CASCADE delete)
 */

// ============================================================
// EXAMPLE: COMPLETE RFQ SAVE
// ============================================================

/**
 * When user fills form and clicks Save:
 * 
 * 1. RFQForm component has this data:
 *    {
 *      customerName: "ABC Corp",
 *      customerEmail: "contact@abc.com",
 *      customerPhone: "1234567890",
 *      projectName: "Project X",
 *      projectLocation: "City, Country",
 *      requestedDate: "2026-01-20",
 *      requiredDate: "2026-02-20",
 *      status: "draft",
 *      totalAmount: 5000,
 *      items: [
 *        {
 *          scaffoldingItemId: "std-frame-1",
 *          scaffoldingItemName: "Standard Frame 1.8m x 1.2m",
 *          quantity: 10,
 *          unitPrice: 85,
 *          totalPrice: 850
 *        }
 *      ]
 *    }
 * 
 * 2. User clicks "Save to Database" button
 * 
 * 3. RFQForm calls: createRFQ(payload)
 * 
 * 4. useRFQAPI hook sends POST /api/rfq with data
 * 
 * 5. API route receives request in app/api/rfq/route.ts
 * 
 * 6. API calls service: createRFQ(payload)
 * 
 * 7. Service layer:
 *    - Generates unique RFQ number (RFQ-20260120-12345)
 *    - Creates RFQ record in MySQL
 *    - Creates RFQItem records in MySQL
 *    - Returns complete RFQ object
 * 
 * 8. API responds with: { success: true, data: RFQ }
 * 
 * 9. Frontend shows: "RFQ created and saved to database!"
 * 
 * 10. Data is now in MySQL:
 *     RFQ table:
 *     | id  | rfqNumber       | customerName | status |
 *     | 123 | RFQ-20260120... | ABC Corp     | draft  |
 * 
 *     RFQItem table:
 *     | id  | rfqId | scaffoldingItemName        | quantity |
 *     | 456 | 123   | Standard Frame 1.8m x 1.2m | 10       |
 */

// ============================================================
// TESTING THE SETUP
// ============================================================

/**
 * After implementing, test with this curl command:
 * 
 * curl -X POST http://localhost:3000/api/rfq \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "customerName": "Test Company",
 *     "customerEmail": "test@example.com",
 *     "customerPhone": "1234567890",
 *     "projectName": "Test Project",
 *     "projectLocation": "Test Location",
 *     "requestedDate": "2026-01-20",
 *     "requiredDate": "2026-02-20",
 *     "status": "draft",
 *     "totalAmount": 1000,
 *     "createdBy": "test_user",
 *     "items": [
 *       {
 *         "scaffoldingItemId": "std-frame-1",
 *         "scaffoldingItemName": "Standard Frame",
 *         "quantity": 5,
 *         "unit": "piece",
 *         "unitPrice": 85,
 *         "totalPrice": 425
 *       }
 *     ]
 *   }'
 * 
 * Expected response:
 * {
 *   "success": true,
 *   "message": "RFQ created successfully",
 *   "data": {
 *     "id": "cid123...",
 *     "rfqNumber": "RFQ-20260120-12345",
 *     "customerName": "Test Company",
 *     ...
 *   }
 * }
 */

// ============================================================
// SUMMARY
// ============================================================

/**
 * Files Created:
 * ✓ src/services/rfq.service.ts (Business logic)
 * ✓ app/api/rfq/route.ts (API endpoints)
 * ✓ app/api/rfq/[id]/route.ts (Dynamic API endpoints)
 * ✓ src/hooks/useRFQAPI.ts (React hook)
 * ✓ SETUP_RFQ_MODULE.md (Detailed guide)
 * ✓ RFQ_MODULE_SUMMARY.md (Overview)
 * ✓ RFQ_QUICK_START.md (This file)
 * 
 * Steps to Implement:
 * 1. Add Prisma models to schema.prisma
 * 2. Run migration: npx prisma migrate dev --name add_rfq_tables
 * 3. Update RFQForm component to use useRFQAPI hook
 * 4. Test by creating an RFQ in the app
 * 5. Verify data in phpMyAdmin
 * 
 * All code is written and ready to use.
 * Just copy and paste following the 3 steps above!
 */
