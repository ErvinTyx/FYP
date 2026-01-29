import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Declare global type for Prisma client singleton
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var  
  var __prismaAdapter: PrismaMariaDb | undefined;
  // eslint-disable-next-line no-var
  var __prismaInitialized: boolean | undefined;
}

function getPrismaClient(): PrismaClient {
  // Strict singleton check - only create once per process
  if (globalThis.__prisma && globalThis.__prismaInitialized) {
    return globalThis.__prisma;
  }

  const dbHost = process.env.DATABASE_HOST || "localhost";
  const dbPort = Number(process.env.DATABASE_PORT || 3306);
  const dbUser = process.env.DATABASE_USER || "root";
  const dbPassword = process.env.DATABASE_PASSWORD || "";
  const dbName = process.env.DATABASE_NAME || "power_metal_steel";

  console.log(`[Prisma] Initializing client for: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  // Create adapter only once
  if (!globalThis.__prismaAdapter) {
    console.log(`[Prisma] Creating MariaDB adapter...`);
    globalThis.__prismaAdapter = new PrismaMariaDb({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      connectionLimit: 5,      // Reduced from 10 to be more conservative
      connectTimeout: 60000,   // 60 seconds
      acquireTimeout: 60000,   // 60 seconds
      timeout: 60000,          // 60 seconds
      idleTimeout: 60000,      // Close idle connections after 60s
    });
  }

  console.log(`[Prisma] Creating PrismaClient...`);
  const client = new PrismaClient({ 
    adapter: globalThis.__prismaAdapter,
    log: ["error", "warn"],
  });

  // Cache globally
  globalThis.__prisma = client;
  globalThis.__prismaInitialized = true;

  // Log available models
  const modelKeys = Object.keys(client).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  console.log(`[Prisma] Ready. Models: ${modelKeys.length}`);

  return client;
}

// Export singleton instance
export const prisma = getPrismaClient();
export default prisma;
