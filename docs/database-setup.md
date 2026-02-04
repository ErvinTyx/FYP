# Database Setup & Migration Guide

This guide explains how to set up, update, and manage the database for this project.

## Prerequisites

- Node.js installed
- MySQL server running on `localhost:3306`
- Database named `pms` created
- `.env` file configured with `DATABASE_URL`

## Quick Start

```bash
# Install dependencies (if not done)
npm install

# Apply migrations and seed database
npx prisma migrate dev
npx prisma db seed
```

---

## Common Commands

### Apply Pending Migrations

Run this after pulling new changes that include schema updates:

```bash
npx prisma migrate dev
```

This will:
- Apply any pending migrations
- Regenerate Prisma Client

### Create a New Migration

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name your_migration_name
```

**Naming conventions:**
- `add_user_table` - Adding new tables
- `add_email_to_user` - Adding columns
- `fix_customer_relation` - Fixing issues
- `remove_deprecated_fields` - Removing fields

### Seed the Database

Populate the database with sample data:

```bash
npx prisma db seed
```

### Reset Database (Development Only)

⚠️ **WARNING: This deletes ALL data!**

```bash
npx prisma migrate reset --force
```

This will:
1. Drop all tables
2. Re-apply all migrations
3. Run the seed script

### View Database in Prisma Studio

```bash
npx prisma studio
```

Opens a browser-based GUI to view and edit data.

---

## Workflow Examples

### Scenario 1: Pulled New Changes

```bash
git pull origin main
npx prisma migrate dev
```

### Scenario 2: Adding a New Field

1. Edit `prisma/schema.prisma`:
   ```prisma
   model User {
     id    Int    @id @default(autoincrement())
     email String
     phone String? // new field
   }
   ```

2. Create and apply migration:
   ```bash
   npx prisma migrate dev --name add_phone_to_user
   ```

### Scenario 3: Fresh Start

```bash
npx prisma migrate reset --force
npx prisma db seed
```

---

## Troubleshooting

### "Drift detected" Error

Your database schema doesn't match the migration history.

**Solution (Development):**
```bash
npx prisma migrate reset --force
```

**Solution (Keep Data):**
```bash
npx prisma db push
```

### "Migration failed" Error

A migration couldn't be applied due to data conflicts.

**Solutions:**
1. Fix the data manually, then retry
2. Reset the database (if development)
3. Create a custom migration to handle the data

### Prisma Client Out of Sync

If types don't match the schema:

```bash
npx prisma generate
```

### Connection Refused

Check that MySQL is running:
```bash
# Windows
net start mysql

# Or check MySQL service in Services app
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="mysql://username:password@localhost:3306/pms"
```

See `.env.example` for the full template.

---

## File Structure

```
prisma/
├── schema.prisma      # Database schema definition
├── seed.ts            # Seed data script
└── migrations/        # Migration history
    └── YYYYMMDDHHMMSS_name/
        └── migration.sql
```

---

## Best Practices

1. **Never edit existing migrations** - Create new ones instead
2. **Always commit migrations** - They should be version controlled
3. **Test migrations locally** - Before pushing to shared branches
4. **Use descriptive names** - Makes history easier to understand
5. **Backup before reset** - Export important data first
