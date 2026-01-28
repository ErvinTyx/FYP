# Login Session API

This API endpoint validates user credentials and stores their authentication session.

## Inputs
Header should have this.
* `Content-Type`: `application/x-www-form-urlencoded`
* Request body:
	+ `csrfToken`: CSRF token
	+ `email`: User's email address
	+ `password`: User's password

## Outputs

* `success`: Boolean indicating whether the credentials are valid
* `errorCode`: String indicating the type of error (if any)
* `message`: String describing the error message (if any)

## Error Codes

* 400: `email` or `password` fields are missing
* 401: User not found or invalid credentials
* 500: Error during database query or password comparison
