# Getting a CSRF Token

This API endpoint returns a unique CSRF token for subsequent requests.

## Request

`GET http://localhost:3000/api/auth/csrf`

## Response

The API returns a HTTP status `200` with a JSON payload containing the CSRF token.

### Response Fields

| Field Name | Type | Description |
| --- | --- | --- |
| csrfToken | String | A unique token id | `4f3f6c74c4a9fc010fcc83ea15668e186d1e582bbd72154f613bda865c5bb6f3` |

## Errors

No custom error codes are provided by this API. If an error occurs, a standard HTTP error code is returned along with a JSON payload containing further details about the error.
