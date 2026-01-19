

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ErvinTyx/FYP.git
cd "Power Metal & Steel"
```

### 2. Install Dependencies

```bash
npm install
```

### 4. Configure Environment (Prisma/MySQL)

Create a `.env` file in the repo root:

```bash
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=power_metal_steel

# NextAuth.js Configuration (REQUIRED)
# Generate a secret using: openssl rand -base64 32
# Or visit: https://generate-secret.vercel.app/32
AUTH_SECRET=your-secret-key-here-minimum-32-characters

# Optional: For production deployments
# AUTH_URL=http://localhost:3000
```

**Important:** The `AUTH_SECRET` environment variable is **required** for NextAuth.js to work. Without it, authentication requests will fail with JSON parsing errors.

Then apply the schema to your database:

```bash
npx prisma migrate dev --name init
```
Then seed the database
```
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.
