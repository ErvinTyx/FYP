
## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [MySQL](https://www.mysql.com/) or [MariaDB](https://mariadb.org/) running locally

---

## ⚡ Quick Install (Recommended)

Use the provided installation script to set up the project automatically.

### Linux / macOS

```bash
# Clone the repository
git clone https://github.com/ErvinTyx/FYP.git
cd FYP

# Make the script executable and run it
chmod +x install.sh
./install.sh
```

### Windows (PowerShell)

```powershell
# Clone the repository
git clone https://github.com/ErvinTyx/FYP.git
cd FYP

# Run the installation script
powershell -ExecutionPolicy Bypass -File install.ps1
```

The scripts will:
1. Verify Node.js (v18+), npm, and MySQL are available
2. Install all npm dependencies
3. Copy `.env.example` → `.env` and prompt you to fill in your settings
4. Apply database migrations (`prisma migrate deploy`)
5. Seed the database with initial data
6. Optionally start the development server

---

## 🛠️ Manual Installation

If you prefer to set up step by step:

### 1. Clone the Repository

```bash
git clone https://github.com/ErvinTyx/FYP.git
cd FYP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and edit it with your settings:

```bash
# Linux / macOS
cp .env.example .env

# Windows (Command Prompt)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Open `.env` and update the following values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full MySQL connection string |
| `DATABASE_HOST` | MySQL host (default: `localhost`) |
| `DATABASE_PORT` | MySQL port (default: `3306`) |
| `DATABASE_USER` | MySQL username |
| `DATABASE_PASSWORD` | MySQL password |
| `DATABASE_NAME` | Database name (default: `pms`) |
| `AUTH_SECRET` | Random secret for NextAuth (generate one below) |
| `SMTP_HOST` | SMTP server host for email |
| `SMTP_PORT` | SMTP server port |
| `SMTP_FROM` | Sender email address |

Generate a secure `AUTH_SECRET`:

```bash
# Linux / macOS
openssl rand -hex 32

# Windows (PowerShell)
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4. Apply Database Migrations

```bash
npx prisma migrate deploy
```

### 5. Seed the Database

```bash
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## 🗄️ Database Management

See [docs/database-setup.md](./docs/database-setup.md) for full database management documentation.

| Command | Description |
|---|---|
| `npx prisma migrate deploy` | Apply pending migrations |
| `npm run db:seed` | Seed the database with sample data |
| `npx prisma studio` | Open browser-based database GUI |
| `npx prisma migrate reset --force` | Reset database (**deletes all data**) |

---

## ⏰ Cron Jobs

The application includes automated scripts for overdue checks and billing generation. See [docs/cron-setup.md](./docs/cron-setup.md) for setup instructions.

---

## 📖 Documentation

| Document | Description |
|---|---|
| [Installation Guide](./docs/installation-guide.md) | Full formal installation instructions |
| [Database Setup](./docs/database-setup.md) | Database migration and management |
| [Cron Setup](./docs/cron-setup.md) | Automated overdue checks and billing |
| [API Docs](./docs/api.md) | API endpoint reference |
