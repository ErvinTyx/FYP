# Create User API (Admin)

This API allows **Admin and Super Admin** users to create a new internal staff user. The user is created with status `pending_verification`; a password-setup token is generated and an email is sent so the user can set their password. No password is sent in the request. The action is audit-logged.

---

## Signature

**Signature:**
`POST /api/user-management`

---

## Inputs

### Headers

* Authorization token (session-based authentication)
* `Content-Type: application/json`

### Request Body

| Field     | Type   | Description                                                                 | Required |
| --------- | ------ | --------------------------------------------------------------------------- | -------- |
| firstName | String | User first name                                                             | Yes      |
| lastName  | String | User last name                                                              | Yes      |
| email     | String | User email (must be unique; valid email format)                              | Yes      |
| role      | String | Role name (e.g. `admin`, `sales`, `finance`, `support`, `operations`, `production`). Must exist in DB. | Yes      |
| phone     | String | Contact phone number (optional; must be unique and valid format if provided) | No       |
| status    | String | One of: `pending`, `pending_verification`, `active`, `inactive`. Default: `pending_verification` | No       |

---

## Access Control Rules

| Condition                              | Result           |
| -------------------------------------- | ---------------- |
| Not authenticated                      | 401 Unauthorized |
| Authenticated but not Admin/SuperAdmin  | 403 Forbidden    |
| Admin / Super Admin                    | Allowed          |

---

## Validation Rules

* `firstName`, `lastName`, `email`, and `role` are required.
* Email must be unique and valid format.
* Phone (if provided) must be valid and unique.
* `status` must be one of: `pending`, `pending_verification`, `active`, `inactive`.
* `role` must match an existing role in the database.

---

## Outputs

### Successful Response

**HTTP 200**

```json
{
  "success": true,
  "message": "User created successfully. A password setup email has been sent.",
  "emailSent": true,
  "user": {
    "id": "clx123abc",
    "email": "jane.doe@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "0123456789",
    "status": "pending_verification",
    "roles": ["sales"],
    "createdAt": "2025-03-05T10:00:00.000Z"
  }
}
```

If the password-setup email fails to send, `emailSent` is `false` and the message indicates that the admin should contact the user.

---

## Error Responses

### Bad Request – Missing required fields

**HTTP 400**

```json
{
  "success": false,
  "message": "First name, last name, email, and role are required"
}
```

### Bad Request – Invalid email / phone / status / role

**HTTP 400**

Examples:

* `"Invalid email format"`
* `"Invalid status. Must be pending, pending_verification, active, or inactive"`
* `"A user with this email already exists"`
* `"A user with this phone number already exists"`
* `"Invalid role: <role>"`

### Unauthorized / Forbidden

**HTTP 401 / 403**

Standard responses as in other user-management endpoints.

### Internal Server Error

**HTTP 500**

```json
{
  "success": false,
  "message": "An error occurred while creating the user"
}
```

---

## Example Request

```http
POST /api/user-management
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "phone": "0123456789",
  "role": "sales"
}
```

---

## Audit Logging

User creation is recorded in the audit log (who created, new user email/name/role/status, client IP).
