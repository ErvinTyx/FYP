# Business Flow Analysis - Power Metal & Steel Rental Management System

## Executive Summary

This document provides a comprehensive analysis of all business flows in the Power Metal & Steel scaffolding rental management application, identifies issues, and provides recommendations for improvements.

---

## 1. Core Business Flows

### 1.1 RFQ (Request for Quotation) Flow

**Process:**
1. Customer creates RFQ with project details and scaffolding items
2. RFQ includes items with quantities, rental months, unit prices, and required dates
3. RFQ status: `draft` → (can be updated/modified)
4. RFQ can be converted to Rental Agreement

**Key Entities:**
- `rFQ`: Header with customer info, project details, total amount
- `rFQItem`: Individual items with `requiredDate`, `rentalMonths`, `unitPrice`, `totalPrice` (calculated as `quantity × unitPrice × rentalMonths × 30`)

**Issues Identified:**
- ❌ No RFQ approval workflow - RFQs can be created but there's no formal approval process
- ❌ No RFQ status transitions beyond "draft" - missing "submitted", "approved", "rejected" states
- ❌ RFQ items can have different `requiredDate` per item, but billing uses earliest date - potential confusion
- ⚠️ RFQ total calculation uses `rentalMonths × 30` days - assumes 30-day months (may not align with actual billing cycles)

**Recommendations:**
- Add RFQ status workflow: `draft` → `submitted` → `under_review` → `approved`/`rejected`
- Add RFQ approval/rejection with comments
- Add RFQ versioning for tracking changes
- Consider adding RFQ expiry dates

---

### 1.2 Rental Agreement Flow

**Process:**
1. Create Rental Agreement from RFQ (or manually)
2. Auto-generate agreement number: `RA-YYYY-NNN`
3. Copy items from RFQ to `AgreementItem` (snapshot of pricing)
4. Agreement status: `Draft` → `Active`/`Signed` → `Completed`
5. When signed document uploaded, status becomes `completed` and deposit is auto-created

**Key Entities:**
- `RentalAgreement`: Main agreement with owner/hirer details, terms, signatures
- `AgreementItem`: Snapshot of items with `agreedMonthlyRate` and `minimumRentalMonths`
- `AgreementVersion`: Version history for tracking changes

**Issues Identified:**
- ❌ **CRITICAL**: Deposit auto-creation logic unclear - deposit should be created when agreement is signed, but the trigger is unclear
- ❌ No validation that all RFQ items are included in agreement
- ❌ Agreement can be created without RFQ - may lead to data inconsistency
- ⚠️ `termOfHire` is auto-filled from RFQ items but can be manually overridden - potential for mismatch
- ❌ No validation that agreement status transitions are valid (e.g., can't go from `Draft` to `Completed` without `Signed`)

**Recommendations:**
- Add explicit deposit creation trigger when `signedStatus` becomes `completed`
- Add validation workflow for agreement status transitions
- Enforce that agreements must reference an RFQ (or add explicit "manual agreement" flag)
- Add agreement expiry/termination date tracking

---

### 1.3 Delivery Request Flow

**Process:**
1. Create Delivery Request linked to Agreement
2. Create Delivery Sets (multiple sets per request)
3. Each set goes through workflow steps:
   - **Step 1: Packing List** - Generate packing list number
   - **Step 2: Stock Check** - Validate stock availability, deduct inventory
   - **Step 3: Schedule** - Schedule delivery date/time
   - **Step 4: Packing & Loading** - Record packing/loading with photos
   - **Step 5: Dispatch** - Assign driver, vehicle, record dispatch
   - **Step 6: DO Issued** - Generate Delivery Order number
   - **Step 7: Completion** - Record delivery completion with photos
   - **Step 8: Customer Acknowledgement** - Customer signs, OTP verification, inventory updated

4. When set status becomes `Completed`, auto-generate first monthly rental invoice
5. Additional charges created when `deliveryFee > 0` and status is `Confirmed`

**Key Entities:**
- `DeliveryRequest`: Main request with customer info, agreement number
- `DeliverySet`: Individual sets with status and workflow steps
- Step tables: `DeliveryPackingList`, `DeliveryStockCheck`, `DeliverySchedule`, etc.

**Issues Identified:**
- ❌ **CRITICAL**: Stock deduction happens during Stock Check step - if delivery is cancelled after stock check, stock is not restored
- ❌ No validation that previous steps are completed before advancing (e.g., can schedule before stock check)
- ❌ Stock check prevents double-deduction but doesn't handle partial cancellations
- ❌ Invoice auto-generation only happens on `Completed` status - what if delivery is partially completed?
- ⚠️ Additional charge creation happens on `Confirmed` status - but status flow shows `Pending` → `Confirmed` → `Completed` - unclear when `Confirmed` is set
- ❌ No validation that delivery address matches agreement location
- ❌ DO number uniqueness check allows same DO for sets in same request - may cause confusion

**Recommendations:**
- Add stock restoration logic when delivery is cancelled after stock check
- Add workflow validation to prevent skipping steps
- Add partial delivery support (deliver some items, cancel others)
- Add delivery cancellation workflow with stock restoration
- Clarify status transitions: `Pending` → `Confirmed` → `Packing List Issued` → ... → `Completed`
- Add delivery address validation against agreement

---

### 1.4 Return Request Flow

**Process:**
1. Create Return Request linked to Agreement and Delivery Set
2. Return type: `Partial` or `Full`
3. Collection method: `Self Return` or `Transportation Needed`
4. Workflow steps (varies by collection method):
   - **Step 1: Schedule/Approval** - Approve return, schedule pickup
   - **Step 2: Pickup Confirmation** (Transportation Only) - Confirm driver details
   - **Step 3: Driver Recording** (Transportation Only) - Driver records pickup with photos
   - **Step 4: Warehouse Receipt** - Record receipt at warehouse
   - **Step 5: Inspection & GRN** - Generate GRN, inspect items, record conditions
   - **Step 6: RCF Generation** - Generate Return Condition Form
   - **Step 7: Customer Notification** - Notify customer, handle disputes
   - **Step 8: Completion** - Update inventory, mark complete

5. When return completed, inventory is restored
6. Additional charges created for pickup fees when `pickupFee > 0`

**Key Entities:**
- `ReturnRequest`: Main return request
- `ReturnRequestItem`: Items being returned with quantity breakdown
- `ReturnItemCondition`: Normalized breakdown by condition (Good, Damaged, Replace)
- Step tables: `ReturnSchedule`, `ReturnPickupConfirm`, `ReturnDriverRecording`, etc.

**Issues Identified:**
- ❌ **CRITICAL**: Inventory restoration logic unclear - when exactly is stock restored?
- ❌ Return items use `quantityReturned` but also have `conditions` breakdown - potential for inconsistency
- ❌ No validation that returned quantity doesn't exceed delivered quantity
- ❌ Condition Report is auto-created from return - but inspection happens in return workflow - circular dependency?
- ❌ No handling for items returned in worse condition than expected
- ⚠️ Return status has many states but workflow steps may not align perfectly

**Recommendations:**
- Clarify inventory restoration timing - should happen after inspection completion
- Add validation: `quantityReturned <= quantityDelivered` per item
- Add return item condition validation (Good + Damaged + Replace = quantityReturned)
- Add return cancellation workflow
- Add partial return support (return some items, keep others)

---

### 1.5 Monthly Rental Invoice Flow

**Process:**
1. Invoice auto-generated when delivery set status becomes `Completed`
2. Manual invoice generation also available
3. Billing calculation:
   - Uses 30-day billing cycles anchored to earliest `requiredDate` from RFQ
   - Calculates net quantity: `delivered - returned` per item
   - Calculates usage days within billing period
   - Applies daily rate: `monthlyRate / 30`
   - Enforces minimum rental duration
   - Line total: `netQty × dailyRate × chargeDays`

4. Invoice status: `Pending Payment` → `Pending Approval` → `Paid`/`Rejected`/`Overdue`
5. Customer uploads payment proof → status becomes `Pending Approval`
6. Finance approves with reference number → status becomes `Paid`

**Key Entities:**
- `MonthlyRentalInvoice`: Invoice header with billing period, amounts
- `MonthlyRentalInvoiceItem`: Line items with quantities, rates, days charged

**Issues Identified:**
- ❌ **CRITICAL**: Invoice auto-generation only happens once (on first delivery completion) - subsequent invoices must be manual
- ❌ No automatic invoice generation for subsequent billing cycles
- ❌ Billing uses 30-day cycles but actual months vary - potential for billing discrepancies
- ❌ Invoice calculation uses `delivered - returned` but doesn't account for partial returns within billing period
- ❌ No validation that invoice doesn't overlap with existing invoices for same agreement/period
- ⚠️ Invoice due date is always 7 days from creation - should be configurable
- ❌ No handling for overdue invoices (status exists but no auto-update)

**Recommendations:**
- Add automatic invoice generation for each billing cycle (monthly cron job)
- Add invoice overlap validation
- Add overdue invoice auto-update (daily cron job)
- Add configurable due date rules
- Add invoice cancellation/void workflow
- Add invoice adjustment/credit note integration

---

### 1.6 Additional Charges Flow

**Process:**
1. Additional charges created from three sources:
   - **Delivery Fee**: When delivery set status becomes `Confirmed` with `deliveryFee > 0`
   - **Pickup Fee**: When return request has `pickupFee > 0`
   - **Damage/Repair**: From Open Repair Slip (inspection module)

2. Charge status: `pending_payment` → `pending_approval` → `approved`/`rejected`
3. Customer uploads payment proof → status becomes `pending_approval`
4. Finance approves → status becomes `approved`

**Key Entities:**
- `AdditionalCharge`: Charge header with customer info, total amount
- `AdditionalChargeItem`: Line items with item type (Damage, Repair), quantities, prices

**Issues Identified:**
- ❌ **CRITICAL**: Delivery fee charge creation happens on `Confirmed` status - but status flow may not always reach `Confirmed`
- ❌ No validation that charge amount matches source (delivery fee, pickup fee, repair costs)
- ❌ Charge can be created from repair slip but repair slip may not be completed - timing issue
- ❌ No handling for charge disputes or adjustments
- ⚠️ Charge items use `itemType` (Damage, Repair) but delivery/return charges may not have item breakdown

**Recommendations:**
- Clarify when delivery fee charges are created (should be on delivery completion, not confirmation)
- Add charge validation against source amounts
- Add charge adjustment workflow
- Add charge dispute handling
- Add charge cancellation/void workflow

---

### 1.7 Inspection & Maintenance Flow

**Process:**
1. Condition Report created from return inspection
2. Inspection items recorded with conditions: Good, Repair, Write-Off
3. Open Repair Slip created for items needing repair
4. Repair items tracked with repair actions and costs
5. Additional Charge created from repair slip for damage/repair costs
6. Damage Invoice created for vendor repair costs
7. Inventory adjustments made based on inspection results

**Key Entities:**
- `ConditionReport`: Inspection report with RCF number
- `InspectionItem`: Items inspected with condition breakdown
- `OpenRepairSlip`: Repair work order
- `RepairItem`: Items needing repair with cost breakdown
- `DamageInvoice`: Vendor invoice for repairs

**Issues Identified:**
- ❌ **CRITICAL**: Condition Report auto-created from return - but inspection happens in return workflow - unclear timing
- ❌ Repair slip can be created but repair may not be completed - no tracking of repair completion
- ❌ Inventory adjustments happen but unclear when (during inspection? after repair?)
- ❌ No validation that repair costs don't exceed item value
- ❌ Damage invoice created separately from additional charge - potential for double billing

**Recommendations:**
- Clarify Condition Report creation timing
- Add repair completion tracking
- Add inventory adjustment workflow with validation
- Add repair cost validation
- Integrate damage invoice with additional charge to prevent double billing

---

### 1.8 Deposit Flow

**Process:**
1. Deposit auto-created when rental agreement `signedStatus` becomes `completed`
2. Deposit amount calculated: `RFQ.totalAmount × securityDeposit` (months)
3. Deposit status: `Pending Payment` → `Pending Approval` → `Paid`/`Rejected`/`Overdue`/`Expired`
4. Customer uploads payment proof → status becomes `Pending Approval`
5. Finance approves with reference number → status becomes `Paid`

**Key Entities:**
- `Deposit`: Deposit record with amount, status, payment proof

**Issues Identified:**
- ❌ **CRITICAL**: Deposit auto-creation trigger unclear - code shows it should happen when agreement signed, but implementation may be missing
- ❌ Deposit calculation uses `RFQ.totalAmount × securityDeposit` - but `securityDeposit` is in months, not percentage - confusing
- ❌ No validation that deposit amount matches agreement security deposit
- ❌ Deposit can be manually created - may lead to duplicates
- ⚠️ Deposit status `Expired` exists but no auto-expiry logic

**Recommendations:**
- Add explicit deposit auto-creation when agreement signed
- Clarify deposit calculation formula (is securityDeposit a multiplier or percentage?)
- Add deposit validation against agreement
- Add deposit auto-expiry logic
- Add deposit refund workflow

---

### 1.9 Project Closure Flow

**Process:**
1. User requests project closure for signed agreement
2. Closure request created: `PCR-YYYY-NNN`
3. Validation checks:
   - All items returned
   - No outstanding invoices
   - No disputes
4. Closure request approved → project closed

**Key Entities:**
- `ProjectClosureRequest`: Closure request with validation status

**Issues Identified:**
- ❌ **CRITICAL**: Closure request validation logic unclear - what happens if validation fails?
- ❌ No automatic closure validation - manual checks required
- ❌ No handling for partial closures (some items returned, some not)
- ❌ Closure approval doesn't trigger any cleanup (invoices, deposits, etc.)

**Recommendations:**
- Add automatic closure validation
- Add closure rejection workflow with reasons
- Add closure cleanup (final invoices, deposit refunds, etc.)
- Add partial closure support

---

## 2. Critical Issues Summary

### 2.1 Data Integrity Issues
1. **Stock Deduction Not Reversible**: Stock deducted during delivery stock check but not restored on cancellation
2. **Invoice Overlap Risk**: No validation prevents overlapping invoices for same agreement/period
3. **Return Quantity Validation**: No check that returned quantity ≤ delivered quantity
4. **Deposit Duplication**: Deposit can be manually created, risking duplicates

### 2.2 Workflow Issues
1. **Missing Status Transitions**: Many workflows don't validate status transitions
2. **Incomplete Auto-Generation**: Invoices only auto-generated once, not for subsequent cycles
3. **Unclear Triggers**: Deposit and charge creation triggers are unclear
4. **No Cancellation Workflows**: Deliveries and returns can't be properly cancelled

### 2.3 Business Logic Issues
1. **Billing Cycle Mismatch**: 30-day cycles don't align with calendar months
2. **Stock Restoration Timing**: Unclear when inventory is restored after returns
3. **Charge Creation Timing**: Delivery fees created on `Confirmed` but workflow may not reach that status
4. **Condition Report Timing**: Auto-created from return but inspection happens in return workflow

---

## 3. Recommendations Priority

### High Priority (Critical)
1. ✅ Add stock restoration logic for cancelled deliveries
2. ✅ Add invoice overlap validation
3. ✅ Add automatic monthly invoice generation (cron job)
4. ✅ Clarify and fix deposit auto-creation trigger
5. ✅ Add return quantity validation
6. ✅ Add workflow status transition validation

### Medium Priority (Important)
1. ✅ Add delivery/return cancellation workflows
2. ✅ Add overdue invoice auto-update
3. ✅ Add invoice adjustment/credit note integration
4. ✅ Add charge validation against source amounts
5. ✅ Add repair completion tracking
6. ✅ Add closure validation automation

### Low Priority (Enhancements)
1. ✅ Add RFQ approval workflow
2. ✅ Add configurable due date rules
3. ✅ Add charge dispute handling
4. ✅ Add partial delivery/return support
5. ✅ Add agreement expiry tracking

---

## 4. Suggested Architecture Improvements

### 4.1 Workflow Engine
- Implement a state machine for all workflows
- Add workflow validation middleware
- Add workflow history/audit trail

### 4.2 Event-Driven Architecture
- Use events for auto-generation triggers (invoice, deposit, charges)
- Add event handlers for status changes
- Add event logging for audit

### 4.3 Scheduled Jobs
- Monthly invoice generation cron job
- Overdue invoice update cron job
- Deposit expiry cron job
- Stock level alerts

### 4.4 Validation Layer
- Add business rule validation service
- Add data integrity checks
- Add workflow transition validation

---

## 5. Data Model Improvements

### 5.1 Missing Relationships
- Add explicit foreign keys for all relationships
- Add cascade delete rules where appropriate
- Add unique constraints for business keys

### 5.2 Audit Trail
- Add `createdBy`/`updatedBy` to all tables
- Add `createdAt`/`updatedAt` timestamps
- Add soft delete support

### 5.3 Status Tracking
- Standardize status enums
- Add status transition history
- Add status validation rules

---

## Conclusion

The application has a comprehensive set of business flows covering the entire rental lifecycle. However, there are several critical issues around data integrity, workflow validation, and automatic processes that need to be addressed. The recommendations above prioritize the most critical issues first, followed by important enhancements and finally nice-to-have features.
