import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function createPrismaClient() {
  const dbHost = process.env.DATABASE_HOST || "localhost";
  const dbPort = Number(process.env.DATABASE_PORT || 3306);
  const dbUser = process.env.DATABASE_USER || "root";
  const dbPassword = process.env.DATABASE_PASSWORD || "";
  const dbName = process.env.DATABASE_NAME || "power_metal_steel";

  // Log connection details (without password) for debugging
  console.log(`[Prisma] Creating fresh client for: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  const adapter = new PrismaMariaDb({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    connectionLimit: 10,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000,
  });

  const client = new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Log available models for debugging
  const modelKeys = Object.keys(client).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  console.log(`[Prisma] Available models: ${modelKeys.join(', ')}`);
  console.log(`[Prisma] Has deliveryRequest: ${'deliveryRequest' in client}`);
  console.log(`[Prisma] Has returnRequest: ${'returnRequest' in client}`);

  return client;
}

// Always create a fresh client - DO NOT cache globally until models are working
export const prisma = createPrismaClient();

export default prisma;
