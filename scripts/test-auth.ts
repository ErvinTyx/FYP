import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcrypt";
import "dotenv/config";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || "localhost",
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER || "root",
  password: process.env.DATABASE_PASSWORD || "",
  database: process.env.DATABASE_NAME || "power_metal_steel",
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function testAuth() {
  console.log("🔍 Testing Authentication Setup...\n");

  try {
    // Test 1: Database connection
    console.log("1. Testing database connection...");
    await prisma.$connect();
    console.log("   ✅ Database connection successful\n");

    // Test 2: Check if user exists
    const testEmail = "superadmin@powermetalsteel.com";
    console.log(`2. Looking for user: ${testEmail}`);
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      console.log("   ❌ User not found in database!");
      console.log("   💡 Run 'npm run db:seed' to create the super admin user\n");
      return;
    }

    console.log("   ✅ User found:");
    console.log(`      - ID: ${user.id}`);
    console.log(`      - Email: ${user.email}`);
    console.log(`      - Name: ${user.firstName} ${user.lastName}`);
    console.log(`      - Password hash: ${user.password.substring(0, 20)}...`);
    console.log(`      - Roles: ${user.roles.map((ur) => ur.role.name).join(", ") || "None"}\n`);

    // Test 3: Test password verification
    console.log("3. Testing password verification...");
    const testPassword = "SuperAdmin@2024!";
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    if (isValid) {
      console.log("   ✅ Password verification successful\n");
    } else {
      console.log("   ❌ Password verification failed!");
      console.log(`   💡 Expected password: ${testPassword}`);
      console.log("   💡 The password in the database might not match the expected password\n");
    }

    // Test 4: List all users
    console.log("4. Listing all users in database...");
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (allUsers.length === 0) {
      console.log("   ⚠️  No users found in database");
      console.log("   💡 Run 'npm run db:seed' to seed the database\n");
    } else {
      console.log(`   Found ${allUsers.length} user(s):`);
      allUsers.forEach((u) => {
        const roles = u.roles.map((ur) => ur.role.name).join(", ") || "No roles";
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "No name";
        console.log(`      - ${u.email} (${fullName}) [${roles}]`);
      });
      console.log();
    }

    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Error during testing:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
