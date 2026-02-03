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

  // Prefer DATABASE_URL (as documented in README) if present.
  // Fallback to individual env vars otherwise.
  const databaseUrl = process.env.DATABASE_URL;

  let dbHost = process.env.DATABASE_HOST || "localhost";
  let dbPort = Number(process.env.DATABASE_PORT || 3306);
  let dbUser = process.env.DATABASE_USER || "root";
  let dbPassword = process.env.DATABASE_PASSWORD || "";
  let dbName = process.env.DATABASE_NAME || "power_metal_steel";

  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      // Expected formats:
      //  - mysql://USER:PASSWORD@HOST:PORT/DATABASE
      //  - mariadb://USER:PASSWORD@HOST:PORT/DATABASE
      dbHost = url.hostname || dbHost;
      dbPort = url.port ? Number(url.port) : dbPort;
      dbUser = decodeURIComponent(url.username || dbUser);
      dbPassword = decodeURIComponent(url.password || dbPassword);
      const pathname = url.pathname?.replace(/^\//, "");
      dbName = pathname || dbName;
    } catch (e) {
      console.warn('[Prisma] Failed to parse DATABASE_URL, falling back to DATABASE_HOST/...');
    }
  }

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
      connectionLimit: 20,     // Increased to handle concurrent operations
      connectTimeout: 30000,   // 30 seconds
      acquireTimeout: 30000,   // 30 seconds
      idleTimeout: 30000,      // Close idle connections after 30s to recycle faster
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
