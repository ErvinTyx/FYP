## Overview

This API allows **Admin and Super Admin** users to **bulk import** internal staff users from a JSON payload. Each user is created with status `pending_verification` and receives a password-setup email. Users with existing emails are skipped. Valid roles are internal staff only: `admin`, `sales`, `finance`, `support`, `operations`, `production`.

---

## Signature

**Signature:**
`POST /api/user-management/import`

---

## Inputs

### Headers

* Authorization token (session-based authentication)
* `Content-Type: application/json`

### Request Body

A single object with a `users` array. Each element has the following fields:

| Field     | Type   | Description                                                                 | Required |
| --------- | ------ | --------------------------------------------------------------------------- | -------- |
| firstName | String | User first name                                                             | Yes      |
| lastName  | String | User last name                                                              | Yes      |
| email     | String | User email (valid format; must be unique; existing emails are skipped)      | Yes      |
| role      | String | One of: `admin`, `sales`, `finance`, `support`, `operations`, `production` | Yes      |
| phone     | String | Contact phone number                                                        | No       |

Example:

```json
{
  "users": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane.doe@example.com",
      "role": "sales"
    },
    {
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@example.com",
      "role": "finance",
      "phone": "0123456789"
    }
  ]
}
```

---

## Access Control Rules

| Condition                              | Result           |
| -------------------------------------- | ---------------- |
| Not authenticated                      | 401 Unauthorized |
| Authenticated but not Admin/SuperAdmin  | 403 Forbidden    |
| Admin / Super Admin                    | Allowed          |

---

## Validation Rules

* `users` must be a non-empty array.
* Each user must have `firstName`, `lastName`, `email`, and `role`.
* Email must match a valid email format.
* Role must be one of the valid internal staff roles.
* Rows that fail validation are reported in the `errors` array; valid users are still processed.
* Users whose email already exists are skipped (counted in `skipped`).

---

## Outputs

### Successful Response

**HTTP 200**

```json
{
  "success": true,
  "message": "Successfully imported 2 users",
  "imported": 2,
  "skipped": 1,
  "errors": ["Row 3: Invalid email format (invalid-email)"],
  "users": [
    {
      "id": "clx123abc",
      "email": "jane.doe@example.com",
      "firstName": "Jane",
      "lastName": "Doe"
    }
  ]
}
```

| Field     | Type    | Description                                                                 |
| --------- | ------- | --------------------------------------------------------------------------- |
| imported  | number  | Number of users successfully created                                        |
| skipped   | number  | Number of users skipped (email already exists)                              |
| errors    | string[]| Optional. Validation or per-row errors                                      |
| users     | array   | List of created user objects (id, email, firstName, lastName)              |

If all provided users already exist:

```json
{
  "success": true,
  "message": "All users already exist",
  "imported": 0,
  "skipped": 2
}
```

---

## Error Responses

### Bad Request – No users

**HTTP 400**

```json
{
  "success": false,
  "message": "No users provided for import"
}
```

### Bad Request – No valid users

**HTTP 400**

```json
{
  "success": false,
  "message": "No valid users to import",
  "errors": ["Row 2: Missing required fields", "Row 3: Invalid role \"manager\". Valid roles: admin, sales, finance, support, operations, production"]
}
```

### Unauthorized / Forbidden

**HTTP 401 / 403**

Standard responses as in other user-management endpoints.

### Internal Server Error

**HTTP 500**

```json
{
  "success": false,
  "message": "An error occurred while importing users"
}
```

---

## Notes

* Password setup emails are sent asynchronously; import continues even if some emails fail.
* Duplicate emails in the same request are handled by the database (first wins; others may appear in `errors` or as skipped).
