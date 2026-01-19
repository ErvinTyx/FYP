import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

async function testConnection() {
  console.log("🔍 Testing Database Connection...\n");

  const dbHost = process.env.DATABASE_HOST || "localhost";
  const dbPort = Number(process.env.DATABASE_PORT || 3306);
  const dbUser = process.env.DATABASE_USER || "root";
  const dbPassword = process.env.DATABASE_PASSWORD || "";
  const dbName = process.env.DATABASE_NAME || "power_metal_steel";

  console.log("Connection Configuration:");
  console.log(`  Host: ${dbHost}`);
  console.log(`  Port: ${dbPort}`);
  console.log(`  User: ${dbUser}`);
  console.log(`  Password: ${dbPassword ? "***" : "(empty)"}`);
  console.log(`  Database: ${dbName}\n`);

  try {
    console.log("Attempting to create connection pool...");
    const adapter = new PrismaMariaDb({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      connectionLimit: 1, // Use 1 connection for testing
      connectTimeout: 5000, // 5 seconds
      acquireTimeout: 5000,
      timeout: 5000,
    });

    console.log("✅ Connection pool created successfully");
    console.log("\n💡 If you're still getting pool timeout errors:");
    console.log("   1. Verify your MariaDB/MySQL server is running");
    console.log("   2. Check if the server is accessible at the specified host and port");
    console.log("   3. Verify the database credentials are correct");
    console.log("   4. Ensure the database exists: CREATE DATABASE IF NOT EXISTS " + dbName + ";");
    console.log("   5. Check firewall settings if connecting to a remote server");
    
    // Try a simple query
    console.log("\nAttempting test query...");
    const result = await adapter.queryRaw("SELECT 1 as test");
    console.log("✅ Test query successful:", result);
    
  } catch (error) {
    console.error("\n❌ Connection failed!");
    if (error instanceof Error) {
      console.error("Error:", error.message);
      console.error("\nCommon issues:");
      
      if (error.message.includes("ECONNREFUSED")) {
        console.error("  → Database server is not running or not accessible");
        console.error("  → Check if MariaDB/MySQL service is started");
      } else if (error.message.includes("Access denied")) {
        console.error("  → Invalid username or password");
        console.error("  → Check DATABASE_USER and DATABASE_PASSWORD in .env");
      } else if (error.message.includes("Unknown database")) {
        console.error("  → Database does not exist");
        console.error(`  → Create it with: CREATE DATABASE ${dbName};`);
      } else if (error.message.includes("timeout")) {
        console.error("  → Connection timeout - server might be unreachable");
        console.error("  → Check network connectivity and firewall settings");
      }
    }
    process.exit(1);
  }
}

testConnection();
