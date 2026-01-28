# Forgot Password API

This API endpoint allows users to request a password reset link.

## Inputs

The request body should contain the following fields:

| Field      | Type   | Description                                                                |
|------------|--------|---------------------------------------------------------------------------|
| `email`    | string | The user's email address.                                                   |

## Outputs

The API will respond with a JSON object containing the following fields:

| Field      | Type   | Description                                                                 |
|------------|--------|----------------------------------------------------------------------------|
| `success`  | boolean| A boolean indicating whether the request was successful.                    |
| `errorCode`| string | A string indicating the type of error (if any).                             |
| `message`  | string | A string describing the error message (if any).                           |

## Error Codes

The API may return the following error codes:

| Code      | Description                                                                 |
|-----------|----------------------------------------------------------------------------|
| 400       | If the `email`  field are missing / not found / not active account .|