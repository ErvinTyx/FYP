## Overview

This API allows **Admin and Super Admin** users to approve a pending user registration. When a user registers (customer or internal staff), they are created with status `pending`. Approval sets their status to `active` and, for internal staff, assigns the selected role. An approval notification email is sent to the user.

Only users with status `pending` can be approved. For internal staff, a `role` must be provided.

---

## Signature

**Signature:**
`POST /api/user-management/approve`

---

## Inputs

### Headers

* Authorization token (session-based authentication)
* `Content-Type: application/json`

### Request Body

| Field   | Type   | Description                                                                 | Required |
| ------- | ------ | --------------------------------------------------------------------------- | -------- |
| userId  | String | Unique identifier of the user to approve                                    | Yes      |
| role    | String | Internal staff role to assign (e.g. `admin`, `sales`, `finance`). Required when approving internal staff. | Conditional |

---

## Access Control Rules

| Condition                              | Result           |
| -------------------------------------- | ---------------- |
| Not authenticated                      | 401 Unauthorized |
| Authenticated but not Admin/SuperAdmin  | 403 Forbidden    |
| Admin / Super Admin                    | Allowed          |

---

## Validation Rules

* User must exist and have status `pending`.
* For internal staff (user with no customer role/record), `role` is required.
* Role must be a valid internal role name (e.g. `admin`, `sales`, `finance`, `support`, `operations`, `production`, `super_user`).

---

## Outputs

### Successful Response

**HTTP 200**

```json
{
  "success": true,
  "message": "User approved successfully. Notification email sent.",
  "emailSent": true,
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "status": "active",
    "roles": ["sales"]
  }
}
```

---

## Error Responses

### Bad Request – Missing userId

**HTTP 400**

```json
{
  "success": false,
  "message": "User ID is required"
}
```

### Bad Request – Role required for internal staff

**HTTP 400**

```json
{
  "success": false,
  "message": "Role is required for internal staff approval"
}
```

### Bad Request – User not pending

**HTTP 400**

```json
{
  "success": false,
  "message": "Can only approve users with pending status"
}
```

### User Not Found

**HTTP 404**

```json
{
  "success": false,
  "message": "User not found"
}
```

### Unauthorized / Forbidden

**HTTP 401 / 403**

Standard unauthorized and forbidden responses as in other user-management endpoints.

### Internal Server Error

**HTTP 500**

```json
{
  "success": false,
  "message": "An error occurred while approving the user"
}
```

---

## Audit Logging

Approval is recorded in the audit log, including who approved, which user was approved, and (for internal staff) the assigned role.
