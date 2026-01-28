/**
 * ============================================================
 * RFQ MODULE - ARCHITECTURE DIAGRAM
 * ============================================================
 * 
 * This document shows the complete data flow architecture
 * for the RFQ module MySQL integration.
 * 
 * ============================================================
 * DATA FLOW DIAGRAM
 * ============================================================
 * 
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │                  FRONTEND (React)                        │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                           │
 * │  src/components/rfq/RFQForm.tsx                         │
 * │  ┌──────────────────────────────────────────────────┐   │
 * │  │ Form with fields:                                │   │
 * │  │ - Customer Name, Email, Phone                   │   │
 * │  │ - Project Name, Location                        │   │
 * │  │ - Requested Date, Required Date                 │   │
 * │  │ - RFQ Items (table with add/remove)            │   │
 * │  │                                                  │   │
 * │  │ [Save to Database] button                       │   │
 * │  └──────────────────────────────────────────────────┘   │
 * │          ↓ (user clicks Save button)                     │
 * │  src/hooks/useRFQAPI.ts                                 │
 * │  ┌──────────────────────────────────────────────────┐   │
 * │  │ Hook Functions:                                  │   │
 * │  │ - createRFQ(data)                               │   │
 * │  │ - updateRFQ(id, data)                           │   │
 * │  │ - fetchRFQs(filters)                            │   │
 * │  │ - fetchRFQById(id)                              │   │
 * │  │ - deleteRFQ(id)                                 │   │
 * │  └──────────────────────────────────────────────────┘   │
 * │          ↓ (HTTP POST request)                           │
 * └──────────────────────────────────────────────────────────┘
 *              │
 *              │ POST /api/rfq
 *              │ Content-Type: application/json
 *              │ Body: {customerName, customerEmail, ...}
 *              ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │          BACKEND - NEXT.JS API ROUTES                   │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                           │
 * │  app/api/rfq/route.ts                                   │
 * │  ┌──────────────────────────────────────────────────┐   │
 * │  │ POST /api/rfq                                    │   │
 * │  │ - Validate request                              │   │
 * │  │ - Call createRFQ() from service                 │   │
 * │  │ - Return { success, data }                      │   │
 * │  │                                                  │   │
 * │  │ GET /api/rfq?status=draft                       │   │
 * │  │ - Parse query parameters                        │   │
 * │  │ - Call getAllRFQs() from service                │   │
 * │  │ - Return { success, data: RFQ[] }              │   │
 * │  └──────────────────────────────────────────────────┘   │
 * │          ↓                                               │
 * │  app/api/rfq/[id]/route.ts                              │
 * │  ┌──────────────────────────────────────────────────┐   │
 * │  │ GET /api/rfq/{id}                               │   │
 * │  │ - Extract ID from URL                           │   │
 * │  │ - Call getRFQById() from service                │   │
 * │  │                                                  │   │
 * │  │ PUT /api/rfq/{id}                               │   │
 * │  │ - Validate and call updateRFQ() from service    │   │
 * │  │                                                  │   │
 * │  │ DELETE /api/rfq/{id}                            │   │
 * │  │ - Call deleteRFQ() from service                 │   │
 * │  └──────────────────────────────────────────────────┘   │
 * │          ↓                                               │
 * └──────────────────────────────────────────────────────────┘
 *              │
 *              ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │        BUSINESS LOGIC - SERVICE LAYER                   │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                           │
 * │  src/services/rfq.service.ts                            │
 * │  ┌──────────────────────────────────────────────────┐   │
 * │  │ Core Functions:                                  │   │
 * │  │                                                  │   │
 * │  │ createRFQ(payload)                              │   │
 * │  │ ├─ Generate unique RFQ number                  │   │
 * │  │ ├─ Create RFQ record via Prisma                │   │
 * │  │ ├─ Create RFQItem records via Prisma           │   │
 * │  │ └─ Return complete RFQ with items             │   │
 * │  │                                                  │   │
 * │  │ getRFQById(rfqId)                               │   │
 * │  │ ├─ Query Prisma for RFQ                        │   │
 * │  │ └─ Include related items                       │   │
 * │  │                                                  │   │
 * │  │ getAllRFQs(filters)                             │   │
 * │  │ ├─ Query with filters (status, email, etc)     │   │
 * │  │ └─ Sort by createdAt                           │   │
 * │  │                                                  │   │
 * │  │ updateRFQ(payload)                              │   │
 * │  │ ├─ Update RFQ header                           │   │
 * │  │ ├─ Delete old items                            │   │
 * │  │ └─ Create new items                            │   │
 * │  │                                                  │   │
 * │  │ deleteRFQ(rfqId)                                │   │
 * │  │ ├─ Delete RFQItems (cascade)                   │   │
 * │  │ └─ Delete RFQ                                  │   │
 * │  │                                                  │   │
 * │  │ getRFQStats()                                   │   │
 * │  │ └─ Count RFQs by status                        │   │
 * │  └──────────────────────────────────────────────────┘   │
 * │          ↓ (Prisma ORM)                                 │
 * └──────────────────────────────────────────────────────────┘
 *              │
 *              ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │         PRISMA ORM (Database Abstraction)               │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                           │
 * │  prisma/schema.prisma                                   │
 * │  ┌──────────────────────────────────────────────────┐   │
 * │  │ Models:                                          │   │
 * │  │                                                  │   │
 * │  │ model RFQ {                                      │   │
 * │  │   id: String @id @default(cuid())              │   │
 * │  │   rfqNumber: String @unique                     │   │
 * │  │   customerName: String                          │   │
 * │  │   customerEmail: String                         │   │
 * │  │   status: String @default("draft")             │   │
 * │  │   items: RFQItem[]  ← Relation                  │   │
 * │  │   ... (more fields)                             │   │
 * │  │ }                                                │   │
 * │  │                                                  │   │
 * │  │ model RFQItem {                                  │   │
 * │  │   id: String @id @default(cuid())              │   │
 * │  │   rfqId: String  ← Foreign Key                  │   │
 * │  │   rfq: RFQ @relation(...)                       │   │
 * │  │   quantity: Int                                 │   │
 * │  │   unitPrice: Decimal                            │   │
 * │  │   ... (more fields)                             │   │
 * │  │ }                                                │   │
 * │  └──────────────────────────────────────────────────┘   │
 * │          ↓ (SQL Queries)                                │
 * └──────────────────────────────────────────────────────────┘
 *              │
 *              ↓
 * ┌─────────────────────────────────────────────────────────┐
 * │      MYSQL DATABASE (via phpMyAdmin)                    │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                           │
 * │  power_metal_steel (Database)                           │
 * │  ├─ RFQ (Table)                                         │
 * │  │  ├─ id (Primary Key)                                 │
 * │  │  ├─ rfqNumber (Unique Index)                         │
 * │  │  ├─ customerName (Index)                             │
 * │  │  ├─ customerEmail (Index)                            │
 * │  │  ├─ status (Index)                                   │
 * │  │  ├─ totalAmount (Decimal)                            │
 * │  │  ├─ createdAt (Index)                                │
 * │  │  ├─ updatedAt (Timestamp)                            │
 * │  │  └─ ... (other fields)                               │
 * │  │                                                       │
 * │  └─ RFQItem (Table)                                     │
 * │     ├─ id (Primary Key)                                 │
 * │     ├─ rfqId (Foreign Key → RFQ.id)                     │
 * │     ├─ scaffoldingItemName                              │
 * │     ├─ quantity                                         │
 * │     ├─ unitPrice                                        │
 * │     ├─ totalPrice                                       │
 * │     └─ ... (other fields)                               │
 * │                                                           │
 * └─────────────────────────────────────────────────────────┘
 * 
 * ============================================================
 * REQUEST/RESPONSE EXAMPLES
 * ============================================================
 * 
 * 1. CREATE RFQ
 * ─────────────
 * 
 * REQUEST:
 * POST /api/rfq
 * {
 *   "customerName": "ABC Corp",
 *   "customerEmail": "contact@abc.com",
 *   "customerPhone": "1234567890",
 *   "projectName": "Building A",
 *   "projectLocation": "City, Country",
 *   "requestedDate": "2026-01-20",
 *   "requiredDate": "2026-02-20",
 *   "status": "draft",
 *   "totalAmount": 5000,
 *   "createdBy": "user_123",
 *   "items": [
 *     {
 *       "scaffoldingItemId": "std-frame-1",
 *       "scaffoldingItemName": "Standard Frame 1.8m x 1.2m",
 *       "quantity": 10,
 *       "unit": "piece",
 *       "unitPrice": 85,
 *       "totalPrice": 850
 *     }
 *   ]
 * }
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "message": "RFQ created successfully",
 *   "data": {
 *     "id": "cllx123abc...",
 *     "rfqNumber": "RFQ-20260120-12345",
 *     "customerName": "ABC Corp",
 *     "status": "draft",
 *     "totalAmount": 5000,
 *     "createdAt": "2026-01-20T10:30:00Z",
 *     "items": [
 *       {
 *         "id": "cllx456def...",
 *         "rfqId": "cllx123abc...",
 *         "scaffoldingItemName": "Standard Frame 1.8m x 1.2m",
 *         "quantity": 10,
 *         "unitPrice": 85,
 *         "totalPrice": 850
 *       }
 *     ]
 *   }
 * }
 * 
 * 2. GET ALL RFQs
 * ───────────────
 * 
 * REQUEST:
 * GET /api/rfq?status=draft
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": [
 *     { "id": "...", "rfqNumber": "RFQ-...", ... },
 *     { "id": "...", "rfqNumber": "RFQ-...", ... }
 *   ],
 *   "count": 2
 * }
 * 
 * 3. GET SPECIFIC RFQ
 * ───────────────────
 * 
 * REQUEST:
 * GET /api/rfq/cllx123abc
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "cllx123abc",
 *     "rfqNumber": "RFQ-20260120-12345",
 *     "customerName": "ABC Corp",
 *     "items": [...]
 *   }
 * }
 * 
 * 4. UPDATE RFQ
 * ─────────────
 * 
 * REQUEST:
 * PUT /api/rfq/cllx123abc
 * {
 *   "status": "submitted",
 *   "totalAmount": 5500
 * }
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "message": "RFQ updated successfully",
 *   "data": { ... updated RFQ ... }
 * }
 * 
 * 5. DELETE RFQ
 * ─────────────
 * 
 * REQUEST:
 * DELETE /api/rfq/cllx123abc
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "message": "RFQ deleted successfully"
 * }
 * 
 * ============================================================
 * DATABASE RELATIONSHIPS
 * ============================================================
 * 
 *  RFQ (1) ─────────────────────→ (Many) RFQItem
 * 
 *  ┌────────────────────┐         ┌────────────────────┐
 *  │      RFQ           │         │    RFQItem         │
 *  ├────────────────────┤         ├────────────────────┤
 *  │ id (PK)            │◄────────│ id (PK)            │
 *  │ rfqNumber (UQ)     │  rfqId  │ rfqId (FK)         │
 *  │ customerName       │         │ quantity           │
 *  │ customerEmail      │         │ unitPrice          │
 *  │ status             │         │ totalPrice         │
 *  │ totalAmount        │         │ scaffoldingItemId  │
 *  │ createdAt          │         │ createdAt          │
 *  │ items (relation)   │◄────────│ updatedAt          │
 *  │ updatedAt          │         │                    │
 *  └────────────────────┘         └────────────────────┘
 * 
 * On DELETE RFQ (Cascade):
 * - RFQ record is deleted
 * - All RFQItem records with same rfqId are deleted
 * 
 * ============================================================
 * INDEXES FOR PERFORMANCE
 * ============================================================
 * 
 * RFQ Table Indexes:
 * - rfqNumber (UNIQUE) - Fast lookup by RFQ number
 * - customerName - Filter by customer name
 * - customerEmail - Filter by customer email
 * - status - Filter by status (most common query)
 * - status + createdAt - Combined filter by status and date
 * - createdAt - Sort by creation date
 * 
 * RFQItem Table Indexes:
 * - rfqId - Join with RFQ table
 * 
 * ============================================================
 */
