# Business Registration API

This API endpoint allows businesses to register a new user.

## Inputs

The request body should contain the following fields:

| Field             | Type   | Description                                                                                             |
|-------------------|--------|---------------------------------------------------------------------------------------------------------|
| `firstName`       | string | The first name of the business owner.                                                               |
| `lastName`        | string | The last name of the business owner.                                                                |
| `email`           | string | The email address of the business owner.                                                              |
| `phone`           | string | The phone number of the business owner.                                                            |
| `password`        | string | The password for the business owner account.                                                        |
| `tin`             | string | The TIN (Tax Identification Number) of the business.                                               |
| `idNumber`        | string | The BRN (Business Registration Number) of the business.                                            |
| `idType`          | string | The type of identification document for the business owner. (Must be 'BRN')                          |
| `identityDocument`| File   | The identity document (BRN) of the business. (Optional)                                              |
| `csrfToken`       | string | The CSRF token. (Required for security)                                                            |

## Outputs

The API will respond with a JSON object containing the following fields:

| Field      | Type   | Description                                                                 |
|------------|--------|----------------------------------------------------------------------------|
| `success`  | boolean| A boolean indicating whether the registration was successful. |
| `errorCode`| string | A string indicating the type of error (if any). |
| `message`  | string | A string describing the error message (if any). |

## Error Codes

The API may return the following error codes:

| Code      | Description                                                                 |
|-----------|----------------------------------------------------------------------------|
| 400       | If any of the required fields are missing.                          |
| 401       | If the email address is already registered.                        |
| 403      | If the email address is invalid or already registered.             |
| 500       | If an error occurs during the registration process.                |

## Example Request

```http
POST /api/register/customer/business
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "password": "password123",
  "tin": "1234567890",
  "idNumber": "2023-01-01-001",
  "idType": "BRN",
  "identityDocument": null,
  "csrfToken": "abc123"
}