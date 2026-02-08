# Seeded Account Credentials

Quick reference for all accounts created by `prisma/seed.ts`.

> **Important:** These are development/demo accounts only. Never use these in production.

---

## Staff Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@powermetalsteel.com | SuperAdmin@2024! |
| Admin | admin@powermetalsteel.com | User@2024! |
| Finance | finance@powermetalsteel.com | User@2024! |
| Sales | sales@powermetalsteel.com | User@2024! |
| Operations | operations@powermetalsteel.com | User@2024! |
| Production | production@powermetalsteel.com | User@2024! |
| Vendor | vendor@powermetalsteel.com | User@2024! |

---

## Customer Accounts

All customer accounts use the password: **Customer@2024!**

### Active Customers

| # | Name | Email | Type | ID Type | Status |
|---|------|-------|------|---------|--------|
| 1 | Tan Wei Ming | tanweiming@email.com | Individual | NRIC | Active |
| 2 | John Doe | johndoe@email.com | Individual | Passport | Active |
| 3 | Ahmad Ibrahim | admin@abcconstruction.com.my | Business | BRN | Active |
| 5 | Lee Chee Keong | procurement@megaheng.com.my | Business | BRN | Active |
| 6 | Mohd Razak Hassan | razak.hassan@email.com | Individual | Army ID | Active |
| 7 | Jennifer Lim | projects@sunriseholdings.com.my | Business | BRN | Active |
| 8 | Wei Chen | chen.wei@buildright.sg | Individual | Passport | Active |

### Pending Customers

| # | Name | Email | Type | ID Type | Status |
|---|------|-------|------|---------|--------|
| 4 | Sarah Lim | sarahlim@email.com | Individual | NRIC | Pending |
| 10 | David Wong | admin@urbanconstruction.com.my | Business | BRN | Pending |

### Inactive / Rejected Customers

| # | Name | Email | Type | ID Type | Status | Reason |
|---|------|-------|------|---------|--------|--------|
| 9 | Raj Kumar | kumar.raj@email.com | Individual | NRIC | Inactive | Identity document expired |

---

## Available Roles

`super_user`, `admin`, `finance`, `sales`, `operations`, `production`, `vendor`, `customer`

---

## How to Re-seed

```bash
npx prisma db seed
```
