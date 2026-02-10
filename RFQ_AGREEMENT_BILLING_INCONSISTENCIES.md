# RFQ → Agreement → Monthly Rental Invoice Inconsistencies

## Executive Summary

This document identifies critical data inconsistencies between RFQ, Rental Agreement, and Monthly Rental Invoice calculations that can lead to billing errors and data integrity issues.

---

## 1. Critical Inconsistencies

### 1.1 ❌ **MISSING QUANTITY IN AGREEMENT ITEMS**

**Problem:**
- `AgreementItem` table does NOT store `quantity`
- Only stores: `agreedMonthlyRate`, `minimumRentalMonths`, `scaffoldingItemId`, `scaffoldingItemName`
- RFQ items have `quantity`, but this is lost when converting to Agreement

**Code Evidence:**
```typescript
// app/api/rental-agreement/route.ts:465-472
await (prisma as any).agreementItem.createMany({
  data: rfqItems.map(item => ({
    agreementId: newAgreement.id,
    rfqItemId: item.id,
    scaffoldingItemId: item.scaffoldingItemId,
    scaffoldingItemName: item.scaffoldingItemName,
    agreedMonthlyRate: item.unitPrice,  // ✅ Copied
    minimumRentalMonths: item.rentalMonths || 1,  // ✅ Copied
    // ❌ quantity is NOT copied!
  })),
});
```

**Impact:**
- Cannot validate that delivered quantities match quoted quantities
- Cannot track if all RFQ items have been delivered
- No way to know expected vs actual quantities at agreement level

**Recommendation:**
- Add `quantity` field to `AgreementItem` table
- Copy `quantity` from RFQ when creating agreement
- Use this for validation in delivery workflow

---

### 1.2 ❌ **BILLING USES DELIVERED QUANTITIES, NOT AGREEMENT QUANTITIES**

**Problem:**
- Monthly rental invoice calculation uses **actual delivered quantities** from delivery sets
- Does NOT reference Agreement items or RFQ quantities
- Billing formula: `netQty = delivered.qty - returned.qty`

**Code Evidence:**
```typescript
// app/api/monthly-rental/route.ts:202-207
for (const agreementItem of (agreement.items as any[])) {
  const itemId = agreementItem.scaffoldingItemId;
  const delivered = deliveredData[itemId] || { qty: 0, earliestDelivery: null };
  const returned = returnedData[itemId] || { qty: 0, latestReturn: null };
  
  const netQty = delivered.qty - returned.qty;  // ❌ Uses delivered, not agreement quantity
```

**Impact:**
- If RFQ quotes 100 units but only 50 are delivered, billing is correct (50 units)
- BUT: No validation that delivered quantities don't exceed quoted quantities
- If more is delivered than quoted, customer gets charged for extra without agreement
- Cannot detect if partial deliveries are intentional or errors

**Recommendation:**
- Add validation: `delivered.qty <= agreementItem.quantity`
- Add warning/approval workflow if delivered exceeds quoted
- Track expected vs actual quantities in agreement

---

### 1.3 ❌ **RFQ TOTAL PRICE CALCULATION MISMATCH**

**Problem:**
- RFQ `totalPrice` = `quantity × unitPrice × rentalMonths × 30`
- Monthly rental billing uses: `netQty × dailyRate × actualDays`
- Daily rate = `monthlyRate / 30`
- But billing uses actual usage days, not fixed 30-day months

**Code Evidence:**
```typescript
// RFQ totalPrice calculation (schema comment):
// totalPrice = quantity * unitPrice * rentalMonths * 30

// Monthly rental billing:
const dailyRate = calculateDailyRate(Number(agreementItem.agreedMonthlyRate)); // monthlyRate / 30
const lineTotal = netQty * dailyRate * chargeDays; // Uses actual days, not 30
```

**Impact:**
- RFQ total may not match actual billing if rental period is not exactly `rentalMonths × 30` days
- If customer rents for 35 days but RFQ says 1 month (30 days), billing will be different
- Confusion between quoted price and actual billed amount

**Recommendation:**
- Clarify that RFQ `totalPrice` is an estimate
- Add disclaimer that actual billing is based on daily proration
- Or: Make RFQ total match billing calculation exactly

---

### 1.4 ❌ **BILLING ANCHOR DATE USES EARLIEST RFQ DATE FOR ALL ITEMS**

**Problem:**
- Billing cycle anchor uses `earliest requiredDate` from ALL RFQ items
- But RFQ items can have different `requiredDate` per item
- All items are billed from the same anchor date, even if they were needed later

**Code Evidence:**
```typescript
// app/api/monthly-rental/route.ts:72-89
async function getEarliestRequiredDate(agreementId: string): Promise<Date | null> {
  const rfqItems = await prisma.rFQItem.findMany({
    where: { rfqId: agreement.rfqId },
    select: { requiredDate: true },
    orderBy: { requiredDate: 'asc' },
    take: 1,  // ❌ Only takes earliest date
  });
  return new Date(rfqItems[0].requiredDate);
}
```

**Impact:**
- If RFQ has items with `requiredDate` = Jan 1 and Feb 1, billing starts from Jan 1 for ALL items
- Item needed on Feb 1 gets billed from Jan 1 (charged for extra month)
- Unfair billing if items have different required dates

**Recommendation:**
- Use per-item anchor dates for billing
- Or: Group items by `requiredDate` and bill separately
- Or: Use delivery date as anchor instead of RFQ `requiredDate`

---

### 1.5 ❌ **NO VALIDATION: DELIVERED QUANTITIES VS RFQ QUANTITIES**

**Problem:**
- Frontend validates delivery quantities against RFQ (line 530 in DeliveryReturnManagement.tsx)
- But backend API does NOT validate this
- Delivery can be created with quantities exceeding RFQ without backend check

**Code Evidence:**
```typescript
// Frontend validation (DeliveryReturnManagement.tsx:530):
if (quotedItem && item.quantity > quotedItem.quantity) {
  itemError.quantity = `Quantity cannot exceed quoted amount (${quotedItem.quantity})`;
}

// Backend (app/api/delivery/route.ts:POST):
// ❌ No validation against RFQ quantities
```

**Impact:**
- Frontend validation can be bypassed
- API can accept deliveries exceeding quoted quantities
- No server-side enforcement of business rules

**Recommendation:**
- Add backend validation in delivery POST endpoint
- Check delivered quantities against Agreement items (once quantity is added)
- Reject deliveries that exceed quoted quantities

---

### 1.6 ❌ **AGREEMENT ITEMS DON'T TRACK WHICH SET THEY BELONG TO**

**Problem:**
- RFQ items have `setName` field
- Agreement items do NOT have `setName`
- Cannot map agreement items back to RFQ sets
- Delivery sets use `setName` but can't validate against agreement sets

**Code Evidence:**
```typescript
// RFQ Item:
setName: String  // ✅ Has setName

// Agreement Item:
// ❌ No setName field

// Delivery Set:
setName: String  // ✅ Has setName, but can't validate against agreement
```

**Impact:**
- Cannot validate that delivery set names match RFQ set names
- Cannot track which agreement items belong to which set
- Confusion when multiple sets have same items

**Recommendation:**
- Add `setName` to `AgreementItem` (optional, for backward compatibility)
- Validate delivery set names against agreement sets
- Or: Remove `setName` from delivery sets and use item-level tracking

---

### 1.7 ⚠️ **MINIMUM RENTAL MONTHS MISMATCH**

**Problem:**
- RFQ item: `rentalMonths` (e.g., 3 months)
- Agreement item: `minimumRentalMonths` (copied from `rentalMonths`)
- Billing uses `minimumRentalMonths` to enforce minimum charge
- But `rentalMonths` in RFQ might mean "intended rental period", not "minimum"

**Code Evidence:**
```typescript
// RFQ Item:
rentalMonths: Int  // Intended rental duration?

// Agreement Item:
minimumRentalMonths: Int  // Minimum charge period?

// Billing:
const chargeDays = enforceMinimumCharge(
  totalRentalDays,
  agreementItem.minimumRentalMonths  // Uses as minimum
);
```

**Impact:**
- Semantic confusion: Is `rentalMonths` the intended period or minimum?
- If customer returns early, minimum charge applies (correct)
- But RFQ `totalPrice` assumes full `rentalMonths` period

**Recommendation:**
- Clarify semantics: `rentalMonths` = intended period, `minimumRentalMonths` = minimum charge
- Or: Rename RFQ field to `intendedRentalMonths`
- Document that minimum charge is separate from intended period

---

## 2. Data Flow Issues

### 2.1 RFQ → Agreement Conversion

**Current Flow:**
```
RFQ Item {
  quantity: 100
  unitPrice: 50
  rentalMonths: 3
  requiredDate: Jan 1
  setName: "Set 1"
}
    ↓
Agreement Item {
  agreedMonthlyRate: 50  ✅
  minimumRentalMonths: 3  ✅
  quantity: ???  ❌ LOST
  setName: ???  ❌ LOST
  requiredDate: ???  ❌ LOST
}
```

**Issues:**
- Quantity is lost
- Set name is lost
- Required date is lost (only earliest is used for billing)

---

### 2.2 Agreement → Billing Calculation

**Current Flow:**
```
Agreement Item {
  agreedMonthlyRate: 50
  minimumRentalMonths: 3
  // No quantity!
}
    ↓
Delivery Sets {
  items: [{ quantity: 80 }]  // Actual delivered
}
    ↓
Billing {
  netQty = 80 - 0 = 80  // Uses delivered, not agreement
  dailyRate = 50 / 30
  chargeDays = max(actualDays, 3 * 30)
  total = 80 * (50/30) * chargeDays
}
```

**Issues:**
- No validation that 80 <= agreement quantity
- No way to know if 80 is correct or should be 100
- Billing is correct but lacks validation

---

## 3. Recommended Fixes

### 3.1 Add Quantity to AgreementItem

**Schema Change:**
```prisma
model AgreementItem {
  // ... existing fields
  quantity              Int      // ✅ ADD THIS
  setName               String?  // ✅ ADD THIS (optional)
  requiredDate          DateTime? // ✅ ADD THIS (optional)
}
```

**Migration:**
```sql
ALTER TABLE AgreementItem 
  ADD COLUMN quantity INT NOT NULL DEFAULT 1,
  ADD COLUMN setName VARCHAR(191),
  ADD COLUMN requiredDate DATETIME(3);

-- Backfill from RFQ items
UPDATE AgreementItem ai
JOIN rFQItem rfqi ON ai.rfqItemId = rfqi.id
SET 
  ai.quantity = rfqi.quantity,
  ai.setName = rfqi.setName,
  ai.requiredDate = rfqi.requiredDate;
```

---

### 3.2 Add Backend Validation for Delivery Quantities

**Code Change:**
```typescript
// app/api/delivery/route.ts:POST
// After creating delivery sets, validate quantities

const agreement = await prisma.rentalAgreement.findUnique({
  where: { agreementNo },
  include: { items: true }
});

for (const set of sets) {
  for (const item of set.items) {
    const agreementItem = agreement.items.find(
      ai => ai.scaffoldingItemId === item.scaffoldingItemId
    );
    
    if (agreementItem) {
      // Get total delivered for this item across all sets
      const totalDelivered = /* sum of all deliveries for this item */;
      
      if (totalDelivered + item.quantity > agreementItem.quantity) {
        return NextResponse.json({
          success: false,
          message: `Quantity exceeds agreement: ${item.name} (quoted: ${agreementItem.quantity}, delivered: ${totalDelivered + item.quantity})`
        }, { status: 400 });
      }
    }
  }
}
```

---

### 3.3 Fix Billing Anchor Date Logic

**Option A: Use Per-Item Anchor Dates**
```typescript
// Calculate billing per item using its own requiredDate
for (const agreementItem of agreement.items) {
  const itemAnchorDate = agreementItem.requiredDate || anchorDate;
  const itemCycleNumber = getCycleNumber(itemAnchorDate, periodStart);
  // ... calculate billing for this item
}
```

**Option B: Use Delivery Date as Anchor**
```typescript
// Use actual delivery date instead of RFQ requiredDate
const anchorDate = delivered.earliestDelivery || getEarliestRequiredDate(agreementId);
```

---

### 3.4 Clarify RFQ Total Price Calculation

**Documentation:**
- RFQ `totalPrice` is an **estimate** based on `rentalMonths × 30` days
- Actual billing uses daily proration and actual usage days
- Add disclaimer in RFQ: "Total price is an estimate. Actual billing is based on daily proration."

**Or: Match Calculation Exactly:**
```typescript
// Make RFQ totalPrice match billing calculation
// But this requires knowing actual delivery/return dates at RFQ time (impossible)
```

---

## 4. Priority Fixes

### High Priority (Critical)
1. ✅ **Add `quantity` to AgreementItem** - Required for validation
2. ✅ **Add backend validation for delivery quantities** - Prevent over-delivery
3. ✅ **Fix billing anchor date** - Fair billing per item

### Medium Priority (Important)
4. ✅ **Add `setName` to AgreementItem** - Better tracking
5. ✅ **Clarify RFQ total price semantics** - Documentation
6. ✅ **Add validation warnings** - Alert on quantity mismatches

### Low Priority (Nice to Have)
7. ✅ **Add `requiredDate` to AgreementItem** - Per-item billing
8. ✅ **Add quantity tracking dashboard** - Expected vs actual
9. ✅ **Add agreement item history** - Track changes

---

## 5. Testing Scenarios

### Scenario 1: Partial Delivery
- **RFQ**: 100 units @ $50/month, 3 months
- **Agreement**: 100 units @ $50/month, min 3 months
- **Delivery**: 50 units delivered
- **Expected**: Bill for 50 units, not 100
- **Current**: ✅ Works correctly
- **Issue**: No validation that 50 is intentional vs error

### Scenario 2: Over-Delivery
- **RFQ**: 100 units
- **Agreement**: 100 units
- **Delivery**: 150 units delivered
- **Expected**: Should reject or require approval
- **Current**: ❌ Allows over-delivery without validation

### Scenario 3: Different Required Dates
- **RFQ**: Item A needed Jan 1, Item B needed Feb 1
- **Agreement**: Both items
- **Billing**: Both billed from Jan 1
- **Expected**: Item B should be billed from Feb 1
- **Current**: ❌ Both billed from Jan 1 (unfair)

### Scenario 4: Early Return
- **RFQ**: 3 months rental
- **Agreement**: Min 3 months
- **Delivery**: Jan 1
- **Return**: Feb 15 (45 days)
- **Expected**: Charge for 3 months minimum (90 days)
- **Current**: ✅ Works correctly (enforces minimum)

---

## Conclusion

The main inconsistencies are:
1. **Missing quantity in AgreementItem** - Cannot validate deliveries
2. **Billing uses delivered quantities** - No validation against agreement
3. **Billing anchor date** - Uses earliest date for all items (unfair)
4. **No backend validation** - Frontend-only checks can be bypassed

These issues can lead to:
- Over-billing customers (if items billed from wrong date)
- Under-billing (if validation fails)
- Data integrity issues (quantities don't match)
- Customer disputes (unfair billing)

**Recommended Action:** Implement High Priority fixes first, then Medium Priority, then Low Priority enhancements.
