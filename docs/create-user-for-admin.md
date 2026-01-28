# Create User API for administrator

This API endpoint allows users to create user.



## Inputs

The request body should contain the following fields:

| Field             | Type   | Description                                                                                             |
|-------------------|--------|---------------------------------------------------------------------------------------------------------|
| `firstName`       | string | The first name of the user.                                                                   |
| `lastName`        | string | The last name of the user.                                                                    |
| `email`           | string | The email address of the user.                                                                 |
| `phone`           | string | The phone number of the user.                                                                |
| `password`        | string | The password for the user account.                                                            |
| `role`            | string | The role of the user. (Must be one of the following: admin, sales, finance, support, operations, production) |
| `status`          | string | The status of the user. (Must be one of the following: active, inactive)                        |
| `lastLogin`       | string | The last login date and time of the user. (Format: YYYY-MM-DD HH:MM:SS)                        |
| `createdAt`       | string | The creation date and time of the user. (Format: YYYY-MM-DD HH:MM:SS)                           |
| `createdBy`       | string | The user who created the user.                                                               |
| `passwordSet`     | boolean | A boolean indicating whether the user has set their password.                                 |
| `isInternal`      | boolean | A boolean indicating whether the user is an internal staff.                                   |
| `csrfToken`       | string | The CSRF token. (Required for security)                                                        |

## Outputs

The API will respond with a JSON object containing the following fields:

| Field      | Type   | Description                                                                 |
|------------|--------|----------------------------------------------------------------------------|
| `success`  | boolean| A boolean indicating whether the user was successfully created, updated, or deleted. |
| `errorCode`| string | A string indicating the type of error (if any). |
| `message`  | string | A string describing the error message (if any). |

## Error Codes

The API may return the following error codes:

| Code      | Description                                                                 |
|-----------|----------------------------------------------------------------------------|
| 400       | If any of the required fields are missing.                          |
| 401       | If the user is not authorized to perform the action.                |
| 403      | If the user is not authorized to perform the action.                |
| 404      | If the user with the specified ID is not found.                      |
| 500       | If an error occurs during the user creation, update, or deletion. |

## Example Request

```http
POST /api/user-management
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "role": "admin",
  "csrfToken": "abc123"
}