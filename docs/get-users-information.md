## Overview

The main function of this API is to allow **internal staff** to retrieve a list of registered users from the system. Access to the data is **role-based**, ensuring that only authorized internal staff can view user information.

The API supports **role-aware filtering**:

* **Admin / Super Admin** users can retrieve **all users**
* **Non-admin internal staff** can retrieve **customer users only**

This endpoint also transforms user data into a frontend-friendly structure, categorizing users as **Internal Staff**, **Individual Customers**, or **Business Customers**.

---

## Signature

This is a REST-based API that does not require additional URL parameters. It returns a list of users based on the authenticated user’s roles.

**Signature:**
`GET /api/users`

---

## Inputs

This API accepts standard authentication headers for an authenticated request.

### Required Headers

* Authorization token (session-based authentication)
* Standard application headers (e.g., `Content-Type`, `Accept`)

No URL parameters or request body are required.

---

## Access Control Rules

| Condition                            | Access Result            |
| ------------------------------------ | ------------------------ |
| User not authenticated               | 401 Unauthorized         |
| Authenticated but not internal staff | 403 Forbidden            |
| Internal staff (Admin / Super Admin) | View all users           |
| Internal staff (Non-admin)           | View customer users only |

---

## Outputs

### Successful Response

This API returns **HTTP status code 200**.

The response contains a single object with a list of transformed user records.

```json
{
  "success": true,
  "users": [ ... ]
}
```

---

## User Object Structure

Each user object contains the following fields:

### Common Fields

| Output Parameter | Type            | Description                   | Example                |
| ---------------- | --------------- | ----------------------------- | ---------------------- |
| id               | String          | Unique identifier of the user | `clx123abc`            |
| email            | String          | User email address            | `user@example.com`     |
| firstName        | String          | User first name               | `John`                 |
| lastName         | String          | User last name                | `Doe`                  |
| phone            | String          | Contact phone number          | `0123456789`           |
| status           | String          | Current account status        | `ACTIVE`               |
| roles            | Array<String>   | List Assigned role            | `["admin"]`            |
| userType         | String          | Derived user category         | `Internal Staff`       |
| createdAt        | Date (ISO 8601) | Account creation date         | `2025-01-15T08:30:00Z` |
| updatedAt        | Date (ISO 8601) | Last update date              | `2025-01-20T10:15:00Z` |

---

## User Type Determination Logic

The `userType` field is derived using the following rules:

| Condition                               | User Type                       |
| --------------------------------------- | ------------------------------- |
| Has `customer` role or customer record  | Individual or Business Customer |
| Customer type = `business`              | Business Customer               |
| Customer type = `individual` or null    | Individual Customer             |
| No customer role and no customer record | Internal Staff                  |

---

## Customer-Specific Fields (Optional)

These fields are included **only when the user has an associated customer record**.

| Output Parameter    | Type   | Description                       | Example                       |
| ------------------- | ------ | --------------------------------- | ----------------------------- |
| tin                 | String | Tax Identification Number         | `C1234567890`                 |
| idType              | String | Type of identity document         | `NRIC`                        |
| idNumber            | String | Identity document number          | `900101-01-1234`              |
| identityDocumentUrl | String | URL to uploaded identity document | `https://example.com/doc.pdf` |

---

## Error Responses

Error situations are reported through standard HTTP status codes.

### Unauthorized Access

**HTTP 401**

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

Occurs when the request is made without a valid authenticated session.

---

### Forbidden Access

**HTTP 403**

```json
{
  "success": false,
  "message": "Forbidden: Internal staff access required"
}
```

Occurs when the authenticated user is **not an internal staff member**.

---

### Internal Server Error

**HTTP 500**

```json
{
  "success": false,
  "message": "An error occurred while fetching users"
}
```

Occurs when an unexpected server or database error happens during user retrieval.
