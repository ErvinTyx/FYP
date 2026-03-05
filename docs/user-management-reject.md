## Overview

This API allows **Admin and Super Admin** users to reject a pending user registration. The user record is **deleted** so they can re-register with the same email. A rejection email is sent to the user with the provided reason before deletion. The action is recorded in the audit log.

Only users with status `pending` can be rejected.

---

## Signature

**Signature:**
`POST /api/user-management/reject`

---

## Inputs

### Headers

* Authorization token (session-based authentication)
* `Content-Type: application/json`

### Request Body

| Field           | Type   | Description                                      | Required |
| --------------- | ------ | ------------------------------------------------ | -------- |
| userId          | String | Unique identifier of the user to reject          | Yes      |
| rejectionReason | String | Reason for rejection (included in email to user)  | Yes      |

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
* Both `userId` and `rejectionReason` are required.

---

## Outputs

### Successful Response

**HTTP 200**

```json
{
  "success": true,
  "message": "Registration rejected. Rejection email sent to user@example.com",
  "emailSent": true
}
```

If the rejection email fails to send, the user is still deleted and the response indicates that the email was not sent.

---

## Error Responses

### Bad Request – Missing fields

**HTTP 400**

```json
{
  "success": false,
  "message": "User ID and rejection reason are required"
}
```

### Bad Request – User not pending

**HTTP 400**

```json
{
  "success": false,
  "message": "Can only reject users with pending status"
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

Standard unauthorized and forbidden responses.

### Internal Server Error

**HTTP 500**

```json
{
  "success": false,
  "message": "An error occurred while rejecting the user"
}
```

---

## Audit Logging

Rejection is recorded in the audit log before the user is deleted, including who rejected, which user was rejected, and the rejection reason.
