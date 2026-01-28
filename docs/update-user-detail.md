## Overview

The purpose of this API is to allow **Admin and Super Admin users** to update user details within the system.
This includes updating personal information, account status, and internal staff roles where applicable.

The API enforces **strict role-based access control**:

* Only **Admin / Super Admin** users are permitted to update user records.
* All updates are validated for **data integrity** (e.g., unique email and phone).
* Changes are recorded through **audit logging** for traceability and compliance.

Role updates are only applicable to **internal staff users** and are executed atomically within a database transaction.

---

## Signature

This is a REST-based API that updates a single user record using a path parameter.

**Signature:**
`PUT /api/user-management/{id}`

---

## Inputs

### Path Parameters

| Parameter | Type   | Description                   | Required |
| --------- | ------ | ----------------------------- | -------- |
| id        | String | Unique identifier of the user | Yes      |

---

### Headers

This API accepts standard authentication headers for an authenticated request.

* Authorization token (session-based authentication)
* Standard headers such as `Content-Type: application/json`

---

### Request Body

The request body contains the fields to be updated. All fields are **optional**, and only changed values will be persisted.

| Field     | Type          | Description                              | Example              |
| --------- | ------------- | ---------------------------------------- | -------------------- |
| firstName | String        | User first name                          | `John`               |
| lastName  | String        | User last name                           | `Doe`                |
| email     | String        | User email address (must be unique)      | `john.doe@email.com` |
| phone     | String | null | Contact phone number (must be unique)    | `0123456789`         |
| status    | String        | Account status                           | `ACTIVE`             |
| role      | String        | Internal staff role (admin, staff, etc.) | `admin`              |

---

## Access Control Rules

| Condition                              | Result           |
| -------------------------------------- | ---------------- |
| Not authenticated                      | 401 Unauthorized |
| Authenticated but not Admin/SuperAdmin | 403 Forbidden    |
| Admin / Super Admin                    | Allowed          |

---

## Validation Rules

* **Email** must be unique across all users.
* **Phone number** must be unique across all users.
* **Role updates** are only applied if the user is an internal staff member.
* Invalid roles will result in an error.
* If no fields are changed, no audit log is created.

---

## Outputs

### Successful Response

This API returns **HTTP status code 200**.

```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": "clx123abc",
    "email": "john.doe@email.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "0123456789",
    "status": "ACTIVE",
    "roles": ["admin"]
  }
}
```

---

## Audit Logging

When updates occur, the system records:

* **Who performed the update**
* **Which user was updated**
* **Fields changed (before and after values)**
* **Client IP address**

Special handling is applied for **status changes**, which are logged separately for compliance and tracking.

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

Returned when the request does not contain a valid authenticated session.

---

### Forbidden – Insufficient Privileges

**HTTP 403**

```json
{
  "success": false,
  "message": "Forbidden: Only admin and super_user can edit users"
}
```

Returned when a non-admin user attempts to update user details.

---

### User Not Found

**HTTP 404**

```json
{
  "success": false,
  "message": "User not found"
}
```

Returned when the specified user ID does not exist.

---

### Validation Error – Duplicate Email

**HTTP 400**

```json
{
  "success": false,
  "message": "A user with this email already exists"
}
```

---

### Validation Error – Duplicate Phone

**HTTP 400**

```json
{
  "success": false,
  "message": "A user with this phone number already exists"
}
```

---

### Internal Server Error

**HTTP 500**

```json
{
  "success": false,
  "message": "An error occurred while updating the user"
}
```

Returned when an unexpected system or database error occurs
