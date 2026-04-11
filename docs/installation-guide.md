# Installation Guide

**System:** Power Metal & Steel Project Management System (PMS)
**Document Version:** 1.0
**Date:** April 2026

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Pre-Installation Checklist](#2-pre-installation-checklist)
3. [Obtaining the Source Code](#3-obtaining-the-source-code)
4. [Automated Installation](#4-automated-installation)
   - 4.1 [Linux / macOS](#41-linux--macos)
   - 4.2 [Windows](#42-windows)
5. [Manual Installation](#5-manual-installation)
   - 5.1 [Install Dependencies](#51-install-dependencies)
   - 5.2 [Configure Environment Variables](#52-configure-environment-variables)
   - 5.3 [Apply Database Migrations](#53-apply-database-migrations)
   - 5.4 [Seed the Database](#54-seed-the-database)
   - 5.5 [Start the Application](#55-start-the-application)
6. [Post-Installation Verification](#6-post-installation-verification)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. System Requirements

The following software must be installed on the target machine before proceeding with installation.

| Component | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.x or higher | LTS version recommended |
| npm | 9.x or higher | Included with Node.js |
| MySQL / MariaDB | 8.0 / 10.6 or higher | Must be running before setup |
| Git | Any recent version | Required to clone the repository |
| Operating System | Windows 10+, Ubuntu 20.04+, macOS 12+ | |

> **Note:** Ensure that MySQL or MariaDB is running and accessible on `localhost:3306` before starting the installation.

---

## 2. Pre-Installation Checklist

Complete the following before proceeding:

- [ ] Node.js v18 or higher is installed (`node -v` to verify)
- [ ] npm is installed (`npm -v` to verify)
- [ ] MySQL or MariaDB service is running
- [ ] A database named `pms` has been created in MySQL
- [ ] Git is installed (`git --version` to verify)
- [ ] You have the necessary credentials for the MySQL database
- [ ] You have SMTP server credentials for email functionality (if required)

**Create the database** (if it does not already exist):

```sql
CREATE DATABASE pms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 3. Obtaining the Source Code

Clone the repository from GitHub to your local machine:

```bash
git clone https://github.com/ErvinTyx/FYP.git
cd FYP
```

All subsequent commands in this guide must be run from inside the `FYP` project directory.

---

## 4. Automated Installation

The project provides installation scripts that automate all setup steps. This is the recommended approach for most users.

### 4.1 Linux / macOS

**Step 1 — Grant execute permission to the script:**

```bash
chmod +x install.sh
```

**Step 2 — Run the installation script:**

```bash
./install.sh
```

**Step 3 — Configure the environment file when prompted:**

The script will copy `.env.example` to `.env` and pause for you to fill in your database credentials and other settings (see [Section 5.2](#52-configure-environment-variables) for details). Press **ENTER** to continue once the file is saved.

**Step 4 — The script completes the remaining setup automatically:**

- Applies all database migrations
- Seeds the database with initial data
- Offers to start the development server

---

### 4.2 Windows

Open **PowerShell** as a regular user (administrator is not required).

**Step 1 — Navigate to the project directory:**

```powershell
cd FYP
```

**Step 2 — Run the installation script:**

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

> **Note on Execution Policy:** The `-ExecutionPolicy Bypass` flag allows the script to run without permanently changing your system's PowerShell execution policy. This is safe for running trusted local scripts.

**Step 3 — Configure the environment file when prompted:**

The script will copy `.env.example` to `.env` and pause. Open `.env` in a text editor, fill in your settings (see [Section 5.2](#52-configure-environment-variables)), then press **ENTER** in the PowerShell window to continue.

**Step 4 — The script completes the remaining setup automatically:**

- Applies all database migrations
- Seeds the database with initial data
- Offers to start the development server

---

## 5. Manual Installation

Follow this section if you prefer to perform each step individually, or if the automated script encounters an issue.

### 5.1 Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

This command reads `package.json` and installs all declared dependencies into the `node_modules` directory. It also automatically runs `prisma generate` upon completion.

---

### 5.2 Configure Environment Variables

Copy the example environment file:

```bash
# Linux / macOS
cp .env.example .env

# Windows (Command Prompt)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Open the `.env` file in a text editor and configure the following variables:

#### Database Settings

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Full MySQL connection string | `mysql://root:password@localhost:3306/pms` |
| `DATABASE_HOST` | MySQL server hostname | `localhost` |
| `DATABASE_PORT` | MySQL server port | `3306` |
| `DATABASE_USER` | MySQL username | `root` |
| `DATABASE_PASSWORD` | MySQL password | `yourpassword` |
| `DATABASE_NAME` | Target database name | `pms` |

#### Authentication Settings

| Variable | Description |
|---|---|
| `AUTH_SECRET` | A random secret string used to sign session tokens |

Generate a secure value for `AUTH_SECRET` using one of the following commands:

```bash
# Linux / macOS
openssl rand -hex 32

# Windows (PowerShell)
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### Email (SMTP) Settings

| Variable | Description | Default |
|---|---|---|
| `SMTP_HOST` | SMTP server address | `127.0.0.1` |
| `SMTP_PORT` | SMTP server port | `1025` |
| `SMTP_SECURE` | Use TLS (`true` / `false`) | `false` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_FROM` | Sender email address | `noreply@powermetalsteel.com` |

#### Overdue Period Settings

| Variable | Description | Default |
|---|---|---|
| `DEPOSIT_DURATION_OVERDUE` | Days before deposit is marked overdue | `7` |
| `MONTHLY_RENTAL_OVERDUE` | Days before monthly rental is marked overdue | `7` |
| `ADDITIONAL_CHARGE_OVERDUE` | Days before additional charge is marked overdue | `7` |

---

### 5.3 Apply Database Migrations

Run the Prisma migration command to create all required tables in the database:

```bash
npx prisma migrate deploy
```

This command applies all pending migrations from the `prisma/migrations` directory in the correct order. It does not modify any existing data.

---

### 5.4 Seed the Database

Populate the database with the initial data required for the application to function:

```bash
npm run db:seed
```

> **Warning:** Running the seed script on an already-populated database may create duplicate records. Only run this command on a fresh installation.

---

### 5.5 Start the Application

**Development mode** (with hot-reload):

```bash
npm run dev
```

**Production build** (build first, then start):

```bash
npm run build
npm start
```

Once the server is running, open a browser and navigate to:

```
http://localhost:3000
```

---

## 6. Post-Installation Verification

After completing the installation, verify the system is working correctly:

1. **Application loads** — Open `http://localhost:3000` and confirm the login page appears.
2. **Database connection** — Run the database connection test:
   ```bash
   npm run db:test-connection
   ```
3. **Authentication** — Log in using the default credentials created by the seed script (refer to `prisma/seed.ts` for the default user details).
4. **Email (optional)** — If SMTP is configured, trigger a password reset to confirm emails are sent successfully.

---

## 7. Troubleshooting

### Node.js version is too old

```
Error: Node.js v18 or higher is required.
```

Download and install the latest LTS version from [https://nodejs.org/](https://nodejs.org/).

---

### Cannot connect to the database

```
Error: P1001: Can't reach database server at `localhost:3306`
```

1. Verify MySQL or MariaDB is running:
   ```bash
   # Linux (systemd)
   sudo systemctl status mysql

   # Windows
   net start mysql
   ```
2. Confirm the credentials in `.env` are correct.
3. Confirm the database `pms` exists.

---

### Migration fails with "drift detected"

```
Error: P3006: Migration ... failed to apply cleanly
```

This occurs when the database schema does not match the migration history. On a fresh installation, reset the database:

```bash
npx prisma migrate reset --force
```

> **Warning:** This deletes all data. Do not run this on a production database.

---

### PowerShell script is blocked on Windows

```
File cannot be loaded because running scripts is disabled on this system.
```

Run the script with the bypass flag as documented in [Section 4.2](#42-windows):

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

---

### Prisma Client is out of sync

If TypeScript reports type errors related to Prisma models, regenerate the client:

```bash
npx prisma generate
```

---

For additional database management commands, refer to [database-setup.md](./database-setup.md).  
For cron job configuration, refer to [cron-setup.md](./cron-setup.md).
