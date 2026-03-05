# User management

The User Management API covers authentication, user listing, CRUD, approval/rejection of pending registrations, bulk import of internal staff, and password-setup flows. All endpoints (except login and forgot-password) require a valid session. Access is role-based: Admin/Super Admin have full access; other internal staff can list and view customers only.

---

## Authentication & account recovery

# Login
["Read more"](login.md)

# Forgot password
["Read more"](forgot-password.md)

---

## Listing and details

# Get all users
["Read more"](get-users-information.md)

# Get user by ID
["Read more"](get-detail-user-info.md)

---

## Create and update

# Create user (admin)
["Read more"](create-user-for-admin.md)

# Update user
["Read more"](update-user-detail.md)

---

## Pending registrations (approve / reject)

# Approve pending user
["Read more"](user-management-approve.md)

# Reject pending user
["Read more"](user-management-reject.md)

---

## Internal staff (bulk import & setup)

# Bulk import users
["Read more"](user-management-import.md)

# Resend password setup email
["Read more"](user-management-resend-setup.md)