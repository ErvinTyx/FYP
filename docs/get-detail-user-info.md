## Overview

The purpose of this API is to allow **internal staff** to retrieve **detailed information of a single user** based on the user ID.
Access to the user data is strictly **role-based** to protect sensitive internal staff and customer information.

This API enforces the following access rules:

* **Admin / Super Admin** can view **any user**, including internal staff and customer details.
* **Non-admin internal staff** can **only view customer users**.
* **External users** are not allowed to access this API.

The API also determines the user’s **type** (Internal Staff, Individual Customer, or Business Customer) and conditionally exposes sensitive customer information.

---

## Signature

This is a REST-based API that retrieves a single user record using a path parameter.

**Signature:**
`GET /api/user-management/{id}`

---

## Inputs

### Path Parameters

| Parameter | Type   | Description                   | Required |
| --------- | ------ | ----------------------------- | -------- |
| id        | String | Unique identifier of the user | Yes      |

### Headers

This API accepts standard authentication headers for an authenticated request.

* Authorization token (session-based authentication)
* Standard application headers (e.g., `Content-Type`, `Accept`)

No request body is required.

---

## Access Control Rules

| Authenticated User         | Target User    | Result           |
| -------------------------- | -------------- | ---------------- |
| Not authenticated          | Any            | 401 Unauthorized |
| Not internal staff         | Any            | 403 Forbidden    |
| Admin / Super Admin        | Any user       | Allowed          |
| Internal staff (non-admin) | Customer       | Allowed          |
| Internal staff (non-admin) | Internal staff | 403 Forbidden    |

---

## Outputs

### Successful Response

This API returns **HTTP status code 200**.

```json
{
  "success": true,
  "user": { ... }
}
```

---

## User Object Structure

### Common Fields

| Output Parameter | Type            | Description                                 | Example                |
| ---------------- | --------------- | ------------------------------------------- | ---------------------- |
| id               | String          | Unique identifier of the user               | `clx123abc`            |
| email            | String          | User email address                          | `user@example.com`     |
| firstName        | String          | User first name                             | `Jane`                 |
| lastName         | String          | User last name                              | `Doe`                  |
| phone            | String          | Contact phone number                        | `0123456789`           |
| status           | String          | Current account status                      | `ACTIVE`               |
| roles            | Array<String>   | List of assigned role names                 | `["staff"]`            |
| role             | String          | Primary internal staff role (if applicable) | `admin`                |
| userType         | String          | Derived user category                       | `Internal Staff`       |
| createdAt        | Date (ISO 8601) | Account creation date                       | `2025-01-10T09:00:00Z` |
| updatedAt        | Date (ISO 8601) | Last update date                            | `2025-01-18T14:30:00Z` |

---

## User Type Determination

The `userType` field is derived based on the following rules:

| Condition                               | User Type                       |
| --------------------------------------- | ------------------------------- |
| Has `customer` role or customer record  | Individual or Business Customer |
| Customer type = `business`              | Business Customer               |
| Customer type = `individual` or null    | Individual Customer             |
| No customer role and no customer record | Internal Staff                  |

---

## Customer-Specific Fields (Admin Only)

The following fields are **only included when**:

* The user has a customer record, **and**
* The requester is an **Admin or Super Admin**

| Output Parameter    | Type   | Description                       | Example                      |
| ------------------- | ------ | --------------------------------- | ---------------------------- |
| tin                 | String | Tax Identification Number         | `C1234567890`                |
| idType              | String | Identity document type            | `NRIC`                       |
| idNumber            | String | Identity document number          | `900101-01-1234`             |
| identityDocumentUrl | String | URL of uploaded identity document | `https://example.com/id.pdf` |

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

### Forbidden – Not Internal Staff

**HTTP 403**

```json
{
  "success": false,
  "message": "Forbidden: Internal staff access required"
}
```

Returned when a non-internal user attempts to access this API.

---

### Forbidden – Internal Staff Details Restricted

**HTTP 403**

```json
{
  "success": false,
  "message": "Forbidden: Cannot view internal staff details"
}
```

Returned when a **non-admin internal staff** attempts to view another internal staff user.

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

### Internal Server Error

**HTTP 500**

```json
{
  "success": false,
  "message": "An error occurred while fetching user"
}
```

Returned when an unexpected system or database error occurs.
