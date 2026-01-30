/**
 * ============================================================
 * RFQ MODULE - DATABASE INTEGRATION SETUP GUIDE
 * ============================================================
 * 
 * Module: Request for Quotation (RFQ)
 * Date: 2026-01-20
 * Status: Database Integration Ready
 * 
 * This document provides step-by-step instructions for integrating
 * the RFQ module with MySQL database using Prisma ORM.
 * 
 * ============================================================
 * FILES CREATED
 * ============================================================
 * 
 * 1. Backend Service Layer:
 *    - src/services/rfq.service.ts
 *      Purpose: Core business logic for RFQ operations
 *      Exports: createRFQ, getRFQById, getAllRFQs, updateRFQ, deleteRFQ, getRFQStats
 * 
 * 2. API Routes:
 *    - app/api/rfq/route.ts
 *      Purpose: POST (create), GET (list all)
 *      Endpoints: POST /api/rfq, GET /api/rfq?status=draft&customerEmail=test@example.com
 * 
 *    - app/api/rfq/[id]/route.ts
 *      Purpose: GET (by id), PUT (update), DELETE (delete)
 *      Endpoints: GET /api/rfq/123, PUT /api/rfq/123, DELETE /api/rfq/123
 * 
 * 3. React Hook:
 *    - src/hooks/useRFQAPI.ts
 *      Purpose: React hook for component integration
 *      Provides: createRFQ, fetchRFQs, fetchRFQById, updateRFQ, deleteRFQ
 * 
 * 4. Schema Documentation:
 *    - prisma/SCHEMA_RFQ_MODULE.md
 *      Purpose: Database table definitions
 * 
 * ============================================================
 * STEP 1: UPDATE PRISMA SCHEMA
 * ============================================================
 * 
 * Open: prisma/schema.prisma
 * 
 * Add these models to the end of the file:
 * 
 * ============================================================
 * model RFQ {
 *   id                String     @id @default(cuid())
 *   rfqNumber         String     @unique @index
 *   customerName      String     @index
 *   customerEmail     String     @index
 *   customerPhone     String
 *   projectName       String     @index
 *   projectLocation   String
 *   requestedDate     DateTime
 *   requiredDate      DateTime
 *   status            String     @default("draft") @index
 *   totalAmount       Decimal    @default(0) @db.Decimal(15, 2)
 *   notes             String?    @db.LongText
 *   createdBy         String     @index
 *   items             RFQItem[]
 *   createdAt         DateTime   @default(now()) @index
 *   updatedAt         DateTime   @updatedAt
 * 
 *   @@index([rfqNumber])
 *   @@index([status, createdAt])
 * }
 * 
 * model RFQItem {
 *   id                    String     @id @default(cuid())
 *   rfqId                 String     @index
 *   rfq                   RFQ        @relation(fields: [rfqId], references: [id], onDelete: Cascade)
 *   scaffoldingItemId     String
 *   scaffoldingItemName   String
 *   quantity              Int
 *   unit                  String
 *   unitPrice             Decimal    @db.Decimal(15, 2)
 *   totalPrice            Decimal    @db.Decimal(15, 2)
 *   notes                 String?    @db.Text
 *   createdAt             DateTime   @default(now())
 *   updatedAt             DateTime   @updatedAt
 * 
 *   @@index([rfqId])
 * }
 * ============================================================
 * 
 * ============================================================
 * STEP 2: RUN PRISMA MIGRATION
 * ============================================================
 * 
 * In terminal, run:
 * 
 * $ npx prisma migrate dev --name add_rfq_tables
 * 
 * This will:
 * - Create the migration file
 * - Apply changes to the database
 * - Update Prisma client
 * 
 * ============================================================
 * STEP 3: GENERATE PRISMA CLIENT
 * ============================================================
 * 
 * $ npx prisma generate
 * 
 * ============================================================
 * STEP 4: UPDATE RFQForm COMPONENT (Frontend Integration)
 * ============================================================
 * 
 * In: src/components/rfq/RFQForm.tsx
 * 
 * Update the onSave handler:
 * 
 * import { useRFQAPI } from '../../hooks/useRFQAPI';
 * 
 * Inside RFQForm component:
 * 
 * const { createRFQ, updateRFQ } = useRFQAPI();
 * 
 * const handleSave = async (e: React.FormEvent) => {
 *   e.preventDefault();
 *   try {
 *     if (rfq) {
 *       // Update existing RFQ
 *       await updateRFQ(rfq.id, {
 *         status: formData.status,
 *         totalAmount: formData.totalAmount,
 *         notes: formData.notes,
 *         items: items.map(item => ({
 *           scaffoldingItemId: item.scaffoldingItemId,
 *           scaffoldingItemName: item.scaffoldingItemName,
 *           quantity: item.quantity,
 *           unit: item.unit,
 *           unitPrice: item.unitPrice,
 *           totalPrice: item.totalPrice,
 *           notes: item.notes
 *         }))
 *       });
 *     } else {
 *       // Create new RFQ
 *       await createRFQ({
 *         customerName: formData.customerName,
 *         customerEmail: formData.customerEmail,
 *         customerPhone: formData.customerPhone,
 *         projectName: formData.projectName,
 *         projectLocation: formData.projectLocation,
 *         requestedDate: formData.requestedDate,
 *         requiredDate: formData.requiredDate,
 *         status: formData.status,
 *         totalAmount: formData.totalAmount,
 *         notes: formData.notes,
 *         createdBy: 'CurrentUser', // Get from auth context
 *         items: items.map(item => ({
 *           scaffoldingItemId: item.scaffoldingItemId,
 *           scaffoldingItemName: item.scaffoldingItemName,
 *           quantity: item.quantity,
 *           unit: item.unit,
 *           unitPrice: item.unitPrice,
 *           totalPrice: item.totalPrice,
 *           notes: item.notes
 *         }))
 *       });
 *     }
 *     toast.success('RFQ saved to database successfully!');
 *     onSave(formData as any);
 *   } catch (error) {
 *     toast.error(error instanceof Error ? error.message : 'Failed to save RFQ');
 *   }
 * };
 * 
 * ============================================================
 * STEP 5: DATABASE VERIFICATION
 * ============================================================
 * 
 * Access phpMyAdmin:
 * 1. Open your phpMyAdmin interface (typically http://localhost/phpmyadmin)
 * 2. Navigate to database: power_metal_steel
 * 3. Look for two new tables:
 *    - RFQ (Main RFQ records)
 *    - RFQItem (Individual items in each RFQ)
 * 
 * Expected table structure:
 * 
 * RFQ Table:
 * - id (varchar, primary key)
 * - rfqNumber (varchar, unique)
 * - customerName (varchar, indexed)
 * - customerEmail (varchar, indexed)
 * - customerPhone (varchar)
 * - projectName (varchar, indexed)
 * - projectLocation (varchar)
 * - requestedDate (datetime)
 * - requiredDate (datetime)
 * - status (varchar, default: draft, indexed)
 * - totalAmount (decimal 15,2)
 * - notes (longtext)
 * - createdBy (varchar, indexed)
 * - createdAt (datetime, indexed)
 * - updatedAt (datetime)
 * 
 * RFQItem Table:
 * - id (varchar, primary key)
 * - rfqId (varchar, foreign key)
 * - scaffoldingItemId (varchar)
 * - scaffoldingItemName (varchar)
 * - quantity (int)
 * - unit (varchar)
 * - unitPrice (decimal 15,2)
 * - totalPrice (decimal 15,2)
 * - notes (text)
 * - createdAt (datetime)
 * - updatedAt (datetime)
 * 
 * ============================================================
 * STEP 6: TEST API ENDPOINTS
 * ============================================================
 * 
 * Using curl or Postman:
 * 
 * 1. CREATE RFQ:
 *    POST /api/rfq
 *    {
 *      "customerName": "ABC Company",
 *      "customerEmail": "contact@abc.com",
 *      "customerPhone": "1234567890",
 *      "projectName": "Building A",
 *      "projectLocation": "City, Country",
 *      "requestedDate": "2026-01-20",
 *      "requiredDate": "2026-02-20",
 *      "status": "draft",
 *      "totalAmount": 5000,
 *      "createdBy": "john_doe",
 *      "items": [
 *        {
 *          "scaffoldingItemId": "std-frame-1",
 *          "scaffoldingItemName": "Standard Frame 1.8m x 1.2m",
 *          "quantity": 10,
 *          "unit": "piece",
 *          "unitPrice": 85,
 *          "totalPrice": 850
 *        }
 *      ]
 *    }
 * 
 * 2. GET ALL RFQs:
 *    GET /api/rfq
 *    GET /api/rfq?status=draft
 *    GET /api/rfq?customerEmail=contact@abc.com
 * 
 * 3. GET SPECIFIC RFQ:
 *    GET /api/rfq/{rfqId}
 * 
 * 4. UPDATE RFQ:
 *    PUT /api/rfq/{rfqId}
 *    {
 *      "status": "submitted",
 *      "totalAmount": 5500
 *    }
 * 
 * 5. DELETE RFQ:
 *    DELETE /api/rfq/{rfqId}
 * 
 * ============================================================
 * MODULE INTEGRATION SUMMARY
 * ============================================================
 * 
 * Module Modified:
 * - Request for Quotation (RFQ)
 * 
 * Database Tables Created:
 * - RFQ (stores RFQ headers)
 * - RFQItem (stores individual RFQ line items)
 * 
 * New Service Layer:
 * - src/services/rfq.service.ts
 * 
 * New API Routes:
 * - app/api/rfq/route.ts (POST, GET)
 * - app/api/rfq/[id]/route.ts (GET, PUT, DELETE)
 * 
 * New React Hook:
 * - src/hooks/useRFQAPI.ts
 * 
 * Data Flow:
 * Frontend (RFQForm) 
 *   -> useRFQAPI Hook 
 *   -> API Routes (/api/rfq)
 *   -> Service Layer (rfq.service.ts)
 *   -> Prisma ORM
 *   -> MySQL Database
 * 
 * ============================================================
 * TROUBLESHOOTING
 * ============================================================
 * 
 * Error: "RFQ model not found"
 * Solution: Make sure you added the models to prisma/schema.prisma
 *           and ran npx prisma migrate dev
 * 
 * Error: "Connection refused to database"
 * Solution: Check .env file has correct DATABASE_URL
 *           Ensure MySQL server is running
 * 
 * Error: "Foreign key constraint failed"
 * Solution: Make sure rfqId exists in RFQ table before creating RFQItem
 * 
 * Error: "Module not found for useRFQAPI"
 * Solution: Make sure src/hooks/useRFQAPI.ts file exists
 * 
 * ============================================================
 * NEXT STEPS
 * ============================================================
 * 
 * 1. Complete the schema update (Step 1)
 * 2. Run the migration (Step 2)
 * 3. Integrate the hook into RFQForm component (Step 4)
 * 4. Test the API endpoints (Step 6)
 * 5. Create similar modules for:
 *    - Inspection & Maintenance
 *    - Content Management
 * 
 * ============================================================
 */
