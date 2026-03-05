## Overview

This API allows **Admin and Super Admin** users to **resend the password setup email** for a user in `pending_verification` status. Any existing unused password-setup tokens for that user are invalidated; a new token is generated (valid for 15 minutes) and a new setup email is sent.

---

## Signature

**Signature:**
`POST /api/user-management/resend-setup`

---

## Inputs

### Headers

* Authorization token (session-based authentication)
* `Content-Type: application/json`

### Request Body

| Field  | Type   | Description                           | Required |
| ------ | ------ | ------------------------------------- | -------- |
| userId | String | Unique identifier of the user         | Yes      |

---

## Access Control Rules

| Condition                              | Result           |
| -------------------------------------- | ---------------- |
| Not authenticated                      | 401 Unauthorized |
| Authenticated but not Admin/SuperAdmin  | 403 Forbidden    |
| Admin / Super Admin                    | Allowed          |

---

## Validation Rules

* User must exist.
* User must have status `pending_verification`. Other statuses return 400.

---

## Outputs

### Successful Response

**HTTP 200**

```json
{
  "success": true,
  "message": "Password setup email has been resent successfully."
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

### Bad Request – Invalid status

**HTTP 400**

```json
{
  "success": false,
  "message": "Can only resend setup email for users with pending verification status"
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

### Email send failure

**HTTP 500**

```json
{
  "success": false,
  "message": "Failed to send password setup email. Please try again."
}
```

### Unauthorized / Forbidden / Internal Server Error

Standard 401, 403, and 500 responses as in other user-management endpoints.
