import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbHost = process.env.DATABASE_HOST || "localhost";
  const dbPort = Number(process.env.DATABASE_PORT || 3306);
  const dbUser = process.env.DATABASE_USER || "root";
  const dbPassword = process.env.DATABASE_PASSWORD || "";
  const dbName = process.env.DATABASE_NAME || "power_metal_steel";

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b7c4a22a-0601-4c93-b3c4-fcb3bea1d43b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:createPrismaClient',message:'DB config values',data:{dbHost,dbPort,dbUser,dbName,hasPassword:!!dbPassword,envDbName:process.env.DATABASE_NAME,envDbHost:process.env.DATABASE_HOST},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H2'})}).catch(()=>{});
  // #endregion

  // Log connection details (without password) for debugging
  console.log(`[Prisma] Connecting to database: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  const adapter = new PrismaMariaDb({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    connectionLimit: 10, // Increased from 5 to handle more concurrent requests
    connectTimeout: 10000, // 10 seconds connection timeout
    acquireTimeout: 10000, // 10 seconds to acquire connection from pool
    timeout: 10000, // 10 seconds query timeout
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b7c4a22a-0601-4c93-b3c4-fcb3bea1d43b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:adapterCreated',message:'MariaDB adapter created',data:{connectionLimit:10,connectTimeout:10000},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-H5'})}).catch(()=>{});
  // #endregion

  const client = new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
