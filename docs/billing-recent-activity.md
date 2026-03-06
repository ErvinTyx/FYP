## Overview

This API returns a **paginated list of recent billing-related activity** across multiple entity types: deposits, monthly rental invoices, additional charges, credit notes, and refunds. Results are merged and sorted by date (most recent first). Access is restricted to internal staff with roles: `super_user`, `admin`, `sales`, `finance`, `operations`.

---

## Signature

**Signature:**
`GET /api/billing/recent-activity`

---

## Inputs

### Query parameters

| Parameter | Type   | Description                                      | Default |
| --------- | ------ | ------------------------------------------------- | ------- |
| page      | number | Page number (1-based)                             | 1       |
| pageSize  | number | Items per page. Allowed: `5`, `10`, `25`, `50`   | 10      |

### Headers

* Authorization token (session-based authentication)

No request body.

---

## Access Control Rules

| Condition                              | Result           |
| -------------------------------------- | ---------------- |
| Not authenticated                      | 401 Unauthorized |
| Authenticated but role not in allowed list | 403 Forbidden    |
| super_user, admin, sales, finance, operations | Allowed          |

---

## Outputs

### Successful Response

**HTTP 200**

```json
{
  "success": true,
  "data": [
    {
      "id": "monthlyRental-abc123",
      "date": "2025-03-05T14:30:00.000Z",
      "type": "monthlyRental",
      "amount": 1500.00,
      "status": "Paid",
      "reference": "INV-2025-001",
      "entityId": "abc123",
      "entityType": "monthlyRental"
    },
    {
      "id": "deposit-def456",
      "date": "2025-03-04T09:00:00.000Z",
      "type": "deposit",
      "amount": 500.00,
      "status": "Pending",
      "reference": "DEP-2025-001",
      "entityId": "def456",
      "entityType": "deposit"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 10
}
```

### Activity item structure

| Field      | Type   | Description                                                                 |
| ---------- | ------ | --------------------------------------------------------------------------- |
| id         | string | Composite id (e.g. `monthlyRental-abc123`) for the row                      |
| date       | string | ISO 8601 date of the activity (from `updatedAt` or `createdAt`)             |
| type       | string | Entity type: `monthlyRental`, `deposit`, `additionalCharge`, `creditNote`, `refund` |
| amount     | number | Amount (totalAmount, depositAmount, totalCharges, amount, etc.)            |
| status     | string | Normalized status (e.g. Paid, Pending, Pending Approval, Overdue, Approved, Rejected, Expired, Draft) |
| reference  | string | Display reference (invoice number, deposit number, credit note number, refund number) |
| entityId   | string | ID of the underlying entity                                                |
| entityType | string | Same as `type`                                                              |

---

## Error Responses

### Unauthorized

**HTTP 401**

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Forbidden

**HTTP 403**

```json
{
  "success": false,
  "message": "Forbidden"
}
```

### Internal Server Error

**HTTP 500**

```json
{
  "success": false,
  "message": "Internal server error"
}
```

(Or the actual error message when available.)

---

## Notes

* Data is aggregated in memory from multiple tables, then sorted by date and paginated. For very large datasets, consider adding indexes on `updatedAt`/`createdAt` and filtering by date or entity type in future versions.
* Status normalization maps various DB values to display-friendly labels (e.g. “Paid”, “Pending Approval”, “Overdue”).
