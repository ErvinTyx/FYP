# Billing module

The Billing module provides endpoints for billing-related data. Currently it exposes **recent activity** (a unified feed of deposits, monthly rental invoices, additional charges, credit notes, and refunds). The base billing route (`GET/POST /api/billing`) is a placeholder for future use.

---

## Endpoints overview

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/billing` | GET, POST | Placeholder; returns module info. |
| `/api/billing/recent-activity` | GET | Paginated list of latest billing-related activity. |

---

## Recent activity

["Read more"](billing-recent-activity.md)

---

## Placeholder: Base billing route

**`GET /api/billing`**

Returns a simple JSON indicating the billing module:

```json
{
  "module": "billing",
  "message": "Billing API placeholder"
}
```

**`POST /api/billing`**

Placeholder for future “create invoice” or similar actions:

```json
{
  "module": "billing",
  "message": "Create invoice placeholder"
}
```

No authentication or request body is enforced for these placeholder responses. Real billing logic is implemented under `/api/billing/recent-activity` and in other modules (e.g. deposits, monthly rental, additional charges, credit notes, refunds).
