

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
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

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
