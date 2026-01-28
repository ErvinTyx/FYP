/**
 * ============================================================
 * RFQ MODULE - CODE IMPLEMENTATION SUMMARY
 * ============================================================
 * 
 * Date: 2026-01-20
 * Module: Request for Quotation (RFQ) - MySQL Integration
 * Status: COMPLETE - Ready for Implementation
 * 
 * ============================================================
 * PROJECT OVERVIEW
 * ============================================================
 * 
 * This is a completed frontend project using phpMyAdmin/MySQL as backend.
 * The following code enables RFQ data to be persisted to MySQL database.
 * 
 * Three main modules are being modified:
 * 1. Request for Quotation (RFQ) - COMPLETED
 * 2. Inspection & Maintenance - PENDING
 * 3. Content Management - PENDING
 * 
 * ============================================================
 * NEW FILES CREATED FOR RFQ MODULE
 * ============================================================
 * 
 * 📁 Backend Services:
 * ├── src/services/rfq.service.ts
 * │   └── Handles all RFQ database operations
 * │       - createRFQ()
 * │       - getRFQById()
 * │       - getAllRFQs()
 * │       - updateRFQ()
 * │       - deleteRFQ()
 * │       - getRFQStats()
 * 
 * 📁 API Routes:
 * ├── app/api/rfq/route.ts
 * │   └── POST: Create RFQ
 * │   └── GET: List all RFQs with filters
 * │
 * └── app/api/rfq/[id]/route.ts
 *     └── GET: Fetch specific RFQ
 *     └── PUT: Update RFQ
 *     └── DELETE: Delete RFQ
 * 
 * 📁 Frontend Integration:
 * └── src/hooks/useRFQAPI.ts
 *     └── React hook for component integration
 *         - useRFQAPI() hook
 *         - All CRUD operations wrapped
 * 
 * 📁 Documentation:
 * ├── prisma/SCHEMA_RFQ_MODULE.md
 * │   └── Prisma schema models to add to schema.prisma
 * │
 * └── SETUP_RFQ_MODULE.md
 *     └── Complete step-by-step setup guide
 * 
 * ============================================================
 * DATABASE SCHEMA
 * ============================================================
 * 
 * MySQL Tables to be created:
 * 
 * TABLE: RFQ
 * - id (Primary Key, CUID)
 * - rfqNumber (Unique Index)
 * - customerName (Indexed)
 * - customerEmail (Indexed)
 * - customerPhone
 * - projectName (Indexed)
 * - projectLocation
 * - requestedDate (DateTime)
 * - requiredDate (DateTime)
 * - status (Indexed, Default: 'draft')
 * - totalAmount (Decimal 15,2)
 * - notes (LongText, Optional)
 * - createdBy (Indexed)
 * - createdAt (Indexed)
 * - updatedAt (Timestamp)
 * 
 * TABLE: RFQItem
 * - id (Primary Key, CUID)
 * - rfqId (Foreign Key, Indexed)
 * - scaffoldingItemId
 * - scaffoldingItemName
 * - quantity (Integer)
 * - unit
 * - unitPrice (Decimal 15,2)
 * - totalPrice (Decimal 15,2)
 * - notes (Text, Optional)
 * - createdAt (DateTime)
 * - updatedAt (Timestamp)
 * 
 * Relationships:
 * - One RFQ has Many RFQItems (One-to-Many)
 * - Cascade delete: Deleting RFQ deletes all related RFQItems
 * 
 * ============================================================
 * API ENDPOINTS
 * ============================================================
 * 
 * 1. CREATE RFQ
 *    POST /api/rfq
 *    Request Body:
 *    {
 *      "customerName": "string",
 *      "customerEmail": "string",
 *      "customerPhone": "string",
 *      "projectName": "string",
 *      "projectLocation": "string",
 *      "requestedDate": "YYYY-MM-DD",
 *      "requiredDate": "YYYY-MM-DD",
 *      "status": "draft|quoted-for-item|quoted-for-delivery|submitted|approved|rejected|expired",
 *      "totalAmount": number,
 *      "notes": "string (optional)",
 *      "createdBy": "string",
 *      "items": [
 *        {
 *          "scaffoldingItemId": "string",
 *          "scaffoldingItemName": "string",
 *          "quantity": number,
 *          "unit": "string",
 *          "unitPrice": number,
 *          "totalPrice": number,
 *          "notes": "string (optional)"
 *        }
 *      ]
 *    }
 *    Response: { success: true, data: RFQ, message: "RFQ created successfully" }
 * 
 * 2. GET ALL RFQs
 *    GET /api/rfq?status=draft&customerEmail=test@example.com&createdBy=user_id
 *    Query Parameters (all optional):
 *    - status: Filter by status
 *    - customerEmail: Filter by customer email
 *    - createdBy: Filter by creator
 *    Response: { success: true, data: RFQ[], count: number }
 * 
 * 3. GET SPECIFIC RFQ
 *    GET /api/rfq/{rfqId}
 *    Response: { success: true, data: RFQ }
 * 
 * 4. UPDATE RFQ
 *    PUT /api/rfq/{rfqId}
 *    Request Body: (all optional)
 *    {
 *      "status": "string",
 *      "totalAmount": number,
 *      "notes": "string",
 *      "items": [... array of items to replace]
 *    }
 *    Response: { success: true, data: RFQ, message: "RFQ updated successfully" }
 * 
 * 5. DELETE RFQ
 *    DELETE /api/rfq/{rfqId}
 *    Response: { success: true, message: "RFQ deleted successfully" }
 * 
 * ============================================================
 * REACT HOOK USAGE
 * ============================================================
 * 
 * Import the hook:
 * import { useRFQAPI } from '@/src/hooks/useRFQAPI';
 * 
 * Use in component:
 * const {
 *   rfqs,           // Current list of RFQs
 *   loading,        // Boolean: is API call in progress
 *   error,          // Error message if any
 *   createRFQ,      // Function: create new RFQ
 *   fetchRFQs,      // Function: fetch all RFQs
 *   fetchRFQById,   // Function: fetch specific RFQ
 *   updateRFQ,      // Function: update RFQ
 *   deleteRFQ,      // Function: delete RFQ
 *   clearError      // Function: clear error message
 * } = useRFQAPI();
 * 
 * Example usage:
 * 
 * // Create RFQ
 * const newRFQ = await createRFQ({
 *   customerName: "ABC Corp",
 *   customerEmail: "contact@abc.com",
 *   customerPhone: "1234567890",
 *   projectName: "Project X",
 *   projectLocation: "City, Country",
 *   requestedDate: "2026-01-20",
 *   requiredDate: "2026-02-20",
 *   status: "draft",
 *   totalAmount: 5000,
 *   createdBy: "user_123",
 *   items: [...]
 * });
 * 
 * // Fetch all RFQs
 * await fetchRFQs({ status: "draft" });
 * 
 * // Update RFQ
 * await updateRFQ(rfqId, { status: "submitted" });
 * 
 * // Delete RFQ
 * await deleteRFQ(rfqId);
 * 
 * ============================================================
 * INTEGRATION WITH EXISTING COMPONENTS
 * ============================================================
 * 
 * File to Modify: src/components/rfq/RFQForm.tsx
 * 
 * Current State:
 * - Form handles local state only
 * - No database persistence
 * - onSave callback doesn't persist data
 * 
 * Required Changes:
 * 1. Import useRFQAPI hook
 * 2. Call the hook in component
 * 3. Update onSave to call createRFQ or updateRFQ
 * 4. Handle loading and error states
 * 5. Show success toast on save
 * 
 * Example code:
 * 
 * import { useRFQAPI } from '../../hooks/useRFQAPI';
 * import { toast } from 'sonner';
 * 
 * export function RFQForm({ rfq, onSave, onCancel }: RFQFormProps) {
 *   const { createRFQ, updateRFQ, loading, error } = useRFQAPI();
 *   const [formData, setFormData] = useState(...);
 *   const [items, setItems] = useState([]);
 * 
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     try {
 *       if (rfq?.id) {
 *         await updateRFQ(rfq.id, { ...formData, items });
 *       } else {
 *         await createRFQ({ ...formData, items });
 *       }
 *       toast.success('RFQ saved successfully!');
 *       onSave(formData);
 *     } catch (err) {
 *       toast.error(error || 'Failed to save RFQ');
 *     }
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {/* form fields */}
 *       <button disabled={loading}>
 *         {loading ? 'Saving...' : 'Save'}
 *       </button>
 *     </form>
 *   );
 * }
 * 
 * ============================================================
 * SETUP INSTRUCTIONS
 * ============================================================
 * 
 * STEP 1: Update Prisma Schema
 * - Open: prisma/schema.prisma
 * - Add RFQ and RFQItem models (see SCHEMA_RFQ_MODULE.md)
 * - Command: npx prisma migrate dev --name add_rfq_tables
 * 
 * STEP 2: Generate Prisma Client
 * - Command: npx prisma generate
 * 
 * STEP 3: Verify Database Tables
 * - Open phpMyAdmin
 * - Check database has new RFQ and RFQItem tables
 * 
 * STEP 4: Update RFQForm Component
 * - Import useRFQAPI hook
 * - Update handleSubmit to use API
 * - Add loading and error handling
 * 
 * STEP 5: Test API Endpoints
 * - Use Postman or curl to test endpoints
 * - Verify data appears in phpMyAdmin
 * 
 * ============================================================
 * FILE LOCATIONS
 * ============================================================
 * 
 * Root Directory: c:\Users\phang\OneDrive\Documents\GitHub\FYP\
 * 
 * Created Files:
 * 1. src/services/rfq.service.ts
 * 2. app/api/rfq/route.ts
 * 3. app/api/rfq/[id]/route.ts
 * 4. src/hooks/useRFQAPI.ts
 * 5. prisma/SCHEMA_RFQ_MODULE.md
 * 6. SETUP_RFQ_MODULE.md
 * 7. RFQ_MODULE_SUMMARY.md (this file)
 * 
 * ============================================================
 * TECHNOLOGY STACK
 * ============================================================
 * 
 * Frontend:
 * - React 18+ (TypeScript)
 * - Next.js (App Router)
 * - Custom UI Components (Button, Input, etc.)
 * 
 * Backend:
 * - Next.js API Routes
 * - Prisma ORM v5+
 * - MySQL / MariaDB Database
 * 
 * Database:
 * - MySQL (via phpMyAdmin)
 * - Connection: MariaDB Adapter
 * - Tables: RFQ, RFQItem
 * 
 * ============================================================
 * TESTING CHECKLIST
 * ============================================================
 * 
 * After setup, test the following:
 * 
 * ☐ Database migration successful
 * ☐ Tables created in phpMyAdmin
 * ☐ API POST /api/rfq creates record
 * ☐ API GET /api/rfq retrieves all records
 * ☐ API GET /api/rfq/[id] retrieves specific record
 * ☐ API PUT /api/rfq/[id] updates record
 * ☐ API DELETE /api/rfq/[id] deletes record
 * ☐ RFQForm component saves to database
 * ☐ Frontend shows success/error messages
 * ☐ Data persists after page refresh
 * ☐ Filtering works (status, customerEmail, etc.)
 * 
 * ============================================================
 * NEXT PHASES
 * ============================================================
 * 
 * Phase 2: Inspection & Maintenance Module
 * - Create similar service layer
 * - Create API routes
 * - Create React hooks
 * - Update existing components
 * 
 * Phase 3: Content Management Module
 * - Extend existing ContentItem model
 * - Create comprehensive CRUD operations
 * - Add file upload support if needed
 * - Create React hooks
 * 
 * ============================================================
 * SUPPORT & TROUBLESHOOTING
 * ============================================================
 * 
 * For detailed troubleshooting steps, see SETUP_RFQ_MODULE.md
 * 
 * Common Issues:
 * 1. Prisma migration fails → Check schema syntax
 * 2. API returns 500 error → Check database connection
 * 3. Data not appearing → Verify migration ran successfully
 * 4. Hook not importing → Check file path in import statement
 * 
 * ============================================================
 * CONCLUSION
 * ============================================================
 * 
 * All code files for RFQ module MySQL integration are created
 * and ready for implementation. Follow SETUP_RFQ_MODULE.md for
 * step-by-step instructions to complete the setup.
 * 
 * ============================================================
 */
