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

const ROLES = [
  "super_user",
  "admin",
  "finance",
  "sales",
  "operations",
  "production",
  "customer",
] as const;

async function main() {
  console.log("Seeding database...");

  // Create roles
  console.log("Creating roles...");
  for (const roleName of ROLES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    console.log(`  - Role: ${roleName}`);
  }

  // Create super admin user
  console.log("Creating super admin user...");
  const superUserRole = await prisma.role.findUnique({
    where: { name: "super_user" },
  });

  if (!superUserRole) {
    throw new Error("super_user role not found");
  }

  const hashedPassword = await bcrypt.hash("SuperAdmin@2024!", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@powermetalsteel.com" },
    update: {
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      status: "active",
    },
    create: {
      email: "superadmin@powermetalsteel.com",
      firstName: "Super",
      lastName: "Admin",
      password: hashedPassword,
      status: "active",
    },
  });

  // Assign super_user role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: superUserRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superUserRole.id,
    },
  });

  console.log(`  - Super Admin: ${superAdmin.email}`);

  // Create users for specific roles
  console.log("Creating users for specific roles...");
  const rolesToCreateUsersFor = ["admin", "finance", "sales", "operations", "production", "vendor"];

  for (const roleName of rolesToCreateUsersFor) {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    const hashedPassword = await bcrypt.hash("User@2024!", 12);

    const user = await prisma.user.upsert({
      where: { email: `${roleName.toLowerCase()}@powermetalsteel.com` },
      update: {
        password: hashedPassword,
        firstName: roleName,
        lastName: "User",
        status: "active",
      },
      create: {
        email: `${roleName.toLowerCase()}@powermetalsteel.com`,
        firstName: roleName,
        lastName: "User",
        password: hashedPassword,
        status: "active",
      },
    });

    // Assign role to user
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });

    console.log(`  - User ${roleName}: ${user.email}`);
  }
  // Create customer users
  console.log("Creating customer users...");
  
  const customerRole = await prisma.role.findUnique({
    where: { name: "customer" },
  });
  
  if (!customerRole) {
    throw new Error("customer role not found");
  }
  
  const customerPassword = await bcrypt.hash("Customer@2024!", 12);
  
  // Customer 1 - Individual with NRIC (Active)
  const customer1User = await prisma.user.upsert({
    where: { email: "tanweiming@email.com" },
    update: {
      password: customerPassword,
      firstName: "Wei Ming",
      lastName: "Tan",
      phone: "+60123456001",
      status: "active",
    },
    create: {
      email: "tanweiming@email.com",
      firstName: "Wei Ming",
      lastName: "Tan",
      phone: "+60123456001",
      password: customerPassword,
      status: "active",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer1User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer1User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer1User.id },
    update: {
      customerType: "individual",
      tin: "TIN-MY-123456789",
      idType: "NRIC",
      idNumber: "850505-10-1234",
      identityDocumentUrl: "/uploads/customers/nric_tanweiming.pdf",
    },
    create: {
      id: customer1User.id,
      customerType: "individual",
      tin: "TIN-MY-123456789",
      idType: "NRIC",
      idNumber: "850505-10-1234",
      identityDocumentUrl: "/uploads/customers/nric_tanweiming.pdf",
    },
  });
  console.log(`  - Customer 1: ${customer1User.email} (Individual - NRIC)`);

  // Customer 2 - Individual with Passport (Active)
  const customer2User = await prisma.user.upsert({
    where: { email: "johndoe@email.com" },
    update: {
      password: customerPassword,
      firstName: "John",
      lastName: "Doe",
      phone: "+60123456002",
      status: "active",
    },
    create: {
      email: "johndoe@email.com",
      firstName: "John",
      lastName: "Doe",
      phone: "+60123456002",
      password: customerPassword,
      status: "active",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer2User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer2User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer2User.id },
    update: {
      customerType: "individual",
      tin: "TIN-SG-987654321",
      idType: "PASSPORT",
      idNumber: "E12345678",
      identityDocumentUrl: "/uploads/customers/passport_johndoe.pdf",
    },
    create: {
      id: customer2User.id,
      customerType: "individual",
      tin: "TIN-SG-987654321",
      idType: "PASSPORT",
      idNumber: "E12345678",
      identityDocumentUrl: "/uploads/customers/passport_johndoe.pdf",
    },
  });
  console.log(`  - Customer 2: ${customer2User.email} (Individual - Passport)`);

  // Customer 3 - Business with BRN (Active)
  const customer3User = await prisma.user.upsert({
    where: { email: "admin@abcconstruction.com.my" },
    update: {
      password: customerPassword,
      firstName: "Ahmad",
      lastName: "Ibrahim",
      phone: "+60123456003",
      status: "active",
    },
    create: {
      email: "admin@abcconstruction.com.my",
      firstName: "Ahmad",
      lastName: "Ibrahim",
      phone: "+60123456003",
      password: customerPassword,
      status: "active",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer3User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer3User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer3User.id },
    update: {
      customerType: "business",
      tin: "TIN-MY-ABC123456",
      idType: "BRN",
      idNumber: "202001012345",
      identityDocumentUrl: "/uploads/customers/brn_abcconstruction.pdf",
    },
    create: {
      id: customer3User.id,
      customerType: "business",
      tin: "TIN-MY-ABC123456",
      idType: "BRN",
      idNumber: "202001012345",
      identityDocumentUrl: "/uploads/customers/brn_abcconstruction.pdf",
    },
  });
  console.log(`  - Customer 3: ${customer3User.email} (Business - BRN)`);

  // Customer 4 - Individual with NRIC (Pending approval)
  const customer4User = await prisma.user.upsert({
    where: { email: "sarahlim@email.com" },
    update: {
      password: customerPassword,
      firstName: "Sarah",
      lastName: "Lim",
      phone: "+60123456004",
      status: "pending",
    },
    create: {
      email: "sarahlim@email.com",
      firstName: "Sarah",
      lastName: "Lim",
      phone: "+60123456004",
      password: customerPassword,
      status: "pending",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer4User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer4User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer4User.id },
    update: {
      customerType: "individual",
      tin: "TIN-MY-PENDING001",
      idType: "NRIC",
      idNumber: "900812-14-5678",
      identityDocumentUrl: "/uploads/customers/nric_sarahlim.pdf",
    },
    create: {
      id: customer4User.id,
      customerType: "individual",
      tin: "TIN-MY-PENDING001",
      idType: "NRIC",
      idNumber: "900812-14-5678",
      identityDocumentUrl: "/uploads/customers/nric_sarahlim.pdf",
    },
  });
  console.log(`  - Customer 4: ${customer4User.email} (Individual - NRIC, Pending)`);

  // Customer 5 - Business with BRN (Active) - Construction Company
  const customer5User = await prisma.user.upsert({
    where: { email: "procurement@megaheng.com.my" },
    update: {
      password: customerPassword,
      firstName: "Lee",
      lastName: "Chee Keong",
      phone: "+60167654321",
      status: "active",
    },
    create: {
      email: "procurement@megaheng.com.my",
      firstName: "Lee",
      lastName: "Chee Keong",
      phone: "+60167654321",
      password: customerPassword,
      status: "active",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer5User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer5User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer5User.id },
    update: {
      customerType: "business",
      tin: "TIN-MY-MEGAH2024",
      idType: "BRN",
      idNumber: "201901045678",
      identityDocumentUrl: "/uploads/customers/brn_megaheng.pdf",
    },
    create: {
      id: customer5User.id,
      customerType: "business",
      tin: "TIN-MY-MEGAH2024",
      idType: "BRN",
      idNumber: "201901045678",
      identityDocumentUrl: "/uploads/customers/brn_megaheng.pdf",
    },
  });
  console.log(`  - Customer 5: ${customer5User.email} (Business - BRN)`);

  // Customer 6 - Individual with Army ID (Active)
  const customer6User = await prisma.user.upsert({
    where: { email: "razak.hassan@email.com" },
    update: {
      password: customerPassword,
      firstName: "Mohd Razak",
      lastName: "Hassan",
      phone: "+60134567890",
      status: "active",
    },
    create: {
      email: "razak.hassan@email.com",
      firstName: "Mohd Razak",
      lastName: "Hassan",
      phone: "+60134567890",
      password: customerPassword,
      status: "active",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer6User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer6User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer6User.id },
    update: {
      customerType: "individual",
      tin: "TIN-MY-ARMY00123",
      idType: "ARMY",
      idNumber: "ARMY-780315-0843",
      identityDocumentUrl: "/uploads/customers/army_razak.pdf",
    },
    create: {
      id: customer6User.id,
      customerType: "individual",
      tin: "TIN-MY-ARMY00123",
      idType: "ARMY",
      idNumber: "ARMY-780315-0843",
      identityDocumentUrl: "/uploads/customers/army_razak.pdf",
    },
  });
  console.log(`  - Customer 6: ${customer6User.email} (Individual - Army ID)`);

  // Customer 7 - Business with BRN (Active) - Property Developer
  const customer7User = await prisma.user.upsert({
    where: { email: "projects@sunriseholdings.com.my" },
    update: {
      password: customerPassword,
      firstName: "Jennifer",
      lastName: "Lim",
      phone: "+60191234567",
      status: "active",
    },
    create: {
      email: "projects@sunriseholdings.com.my",
      firstName: "Jennifer",
      lastName: "Lim",
      phone: "+60191234567",
      password: customerPassword,
      status: "active",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer7User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer7User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer7User.id },
    update: {
      customerType: "business",
      tin: "TIN-MY-SUNRISE88",
      idType: "BRN",
      idNumber: "202201098765",
      identityDocumentUrl: "/uploads/customers/brn_sunriseholdings.pdf",
    },
    create: {
      id: customer7User.id,
      customerType: "business",
      tin: "TIN-MY-SUNRISE88",
      idType: "BRN",
      idNumber: "202201098765",
      identityDocumentUrl: "/uploads/customers/brn_sunriseholdings.pdf",
    },
  });
  console.log(`  - Customer 7: ${customer7User.email} (Business - BRN)`);

  // Customer 8 - Individual with Passport (Active) - Foreign Contractor
  const customer8User = await prisma.user.upsert({
    where: { email: "chen.wei@buildright.sg" },
    update: {
      password: customerPassword,
      firstName: "Wei",
      lastName: "Chen",
      phone: "+6598765432",
      status: "active",
    },
    create: {
      email: "chen.wei@buildright.sg",
      firstName: "Wei",
      lastName: "Chen",
      phone: "+6598765432",
      password: customerPassword,
      status: "active",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer8User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer8User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer8User.id },
    update: {
      customerType: "individual",
      tin: "TIN-SG-CHEN2024",
      idType: "PASSPORT",
      idNumber: "K9876543A",
      identityDocumentUrl: "/uploads/customers/passport_chenwei.pdf",
    },
    create: {
      id: customer8User.id,
      customerType: "individual",
      tin: "TIN-SG-CHEN2024",
      idType: "PASSPORT",
      idNumber: "K9876543A",
      identityDocumentUrl: "/uploads/customers/passport_chenwei.pdf",
    },
  });
  console.log(`  - Customer 8: ${customer8User.email} (Individual - Passport, Singapore)`);

  // Customer 9 - Individual with NRIC (Inactive/Rejected)
  const customer9User = await prisma.user.upsert({
    where: { email: "kumar.raj@email.com" },
    update: {
      password: customerPassword,
      firstName: "Raj",
      lastName: "Kumar",
      phone: "+60145678901",
      status: "inactive",
    },
    create: {
      email: "kumar.raj@email.com",
      firstName: "Raj",
      lastName: "Kumar",
      phone: "+60145678901",
      password: customerPassword,
      status: "inactive",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer9User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer9User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer9User.id },
    update: {
      customerType: "individual",
      tin: "TIN-MY-RAJ12345",
      idType: "NRIC",
      idNumber: "880915-08-5432",
      identityDocumentUrl: "/uploads/customers/nric_kumar.pdf",
      rejectionReason: "Identity document expired. Please upload a valid NRIC.",
    },
    create: {
      id: customer9User.id,
      customerType: "individual",
      tin: "TIN-MY-RAJ12345",
      idType: "NRIC",
      idNumber: "880915-08-5432",
      identityDocumentUrl: "/uploads/customers/nric_kumar.pdf",
      rejectionReason: "Identity document expired. Please upload a valid NRIC.",
    },
  });
  console.log(`  - Customer 9: ${customer9User.email} (Individual - NRIC, Inactive/Rejected)`);

  // Customer 10 - Business with BRN (Pending approval)
  const customer10User = await prisma.user.upsert({
    where: { email: "admin@urbanconstruction.com.my" },
    update: {
      password: customerPassword,
      firstName: "David",
      lastName: "Wong",
      phone: "+60178889999",
      status: "pending",
    },
    create: {
      email: "admin@urbanconstruction.com.my",
      firstName: "David",
      lastName: "Wong",
      phone: "+60178889999",
      password: customerPassword,
      status: "pending",
    },
  });
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customer10User.id,
        roleId: customerRole.id,
      },
    },
    update: {},
    create: {
      userId: customer10User.id,
      roleId: customerRole.id,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).customer.upsert({
    where: { id: customer10User.id },
    update: {
      customerType: "business",
      tin: "TIN-MY-URBAN2025",
      idType: "BRN",
      idNumber: "202401012345",
      identityDocumentUrl: "/uploads/customers/brn_urbanconstruction.pdf",
    },
    create: {
      id: customer10User.id,
      customerType: "business",
      tin: "TIN-MY-URBAN2025",
      idType: "BRN",
      idNumber: "202401012345",
      identityDocumentUrl: "/uploads/customers/brn_urbanconstruction.pdf",
    },
  });
  console.log(`  - Customer 10: ${customer10User.email} (Business - BRN, Pending)`);

  console.log("Customer users created successfully!");
  console.log("  Summary:");
  console.log("  - 3 Individual customers with NRIC (1 active, 1 pending, 1 inactive/rejected)");
  console.log("  - 2 Individual customers with Passport (active)");
  console.log("  - 1 Individual customer with Army ID (active)");
  console.log("  - 4 Business customers with BRN (3 active, 1 pending)");

  // Rental agreement seeding removed - create agreements through the UI

  // RFQ seeding removed - format has changed to use customer dropdown and rental months
  // New RFQs should be created through the UI with the updated format

  // RFQ linking removed - agreements will be linked to RFQs created through the new UI
  console.log("RFQ linking skipped - will be handled by new RFQ system");

  // Agreement and deposit seeding removed - depends on RFQs which have been updated
  // New agreements and deposits should be created through the UI with the new RFQ system

  // All RFQ-dependent seeding removed due to format changes
  // Monthly invoices removed - depend on delivery requests which depend on RFQs

  // Create scaffolding items
  console.log("Creating scaffolding items...");

  // Delete existing scaffolding items to avoid duplicates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).scaffoldingItem.deleteMany({});

  const scaffoldingItems = [
    // CLUSTER (4.7M) items
    {
      itemCode: 'SC-001',
      name: 'CRAB BASIC STANDARD C60',
      category: 'CLUSTER (4.7M)',
      available: 406,
      price: 0.59,
      originPrice: 41.75,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-002',
      name: 'CRAB STANDARD 0.30M C60',
      category: 'CLUSTER (4.7M)',
      available: 170,
      price: 0.75,
      originPrice: 54.11,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-003',
      name: 'CRAB STANDARD 1.00M C60',
      category: 'CLUSTER (4.7M)',
      available: 388,
      price: 1.46,
      originPrice: 105.77,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-004',
      name: 'CRAB LEDGER 1.50M',
      category: 'CLUSTER (4.7M)',
      available: 918,
      price: 1.12,
      originPrice: 100.96,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Wedge key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
          { description: 'Fastener bolt missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
        ],
      },
    },
    {
      itemCode: 'SC-005',
      name: 'CRAB BRACE H2 X L1.50M',
      category: 'CLUSTER (4.7M)',
      available: 238,
      price: 1.50,
      originPrice: 139.92,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
          { description: 'Diagonal brace fastener missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    // CLUSTER (3.5M) items
    {
      itemCode: 'SC-006',
      name: 'CRAB STANDARD 2.00M C60',
      category: 'CLUSTER (3.5M)',
      available: 362,
      price: 2.59,
      originPrice: 196.99,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-007',
      name: 'CRAB LEDGER 0.70M',
      category: 'CLUSTER (3.5M)',
      available: 360,
      price: 0.56,
      originPrice: 61.08,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Wedge key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
          { description: 'Fastener bolt missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
        ],
      },
    },
    {
      itemCode: 'SC-008',
      name: 'CRAB LEDGER 1.00M',
      category: 'CLUSTER (3.5M)',
      available: 118,
      price: 0.77,
      originPrice: 76.03,
      status: 'Available',
      location: 'Warehouse B',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Wedge key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
          { description: 'Fastener bolt missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
        ],
      },
    },
    {
      itemCode: 'SC-009',
      name: 'CRAB BRACE H2 X L0.70M',
      category: 'CLUSTER (3.5M)',
      available: 138,
      price: 1.31,
      originPrice: 125.48,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
          { description: 'Diagonal brace fastener missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-010',
      name: 'CRAB BRACE H2 X L1.00M',
      category: 'CLUSTER (3.5M)',
      available: 34,
      price: 1.37,
      originPrice: 129.75,
      status: 'Low Stock',
      location: 'Warehouse B',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
          { description: 'Diagonal brace fastener missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    // BUNGALOW (5.5M) items
    {
      itemCode: 'SC-011',
      name: 'CRAB STANDARD 0.75M C60',
      category: 'BUNGALOW (5.5M)',
      available: 206,
      price: 1.21,
      originPrice: 87.32,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-012',
      name: 'CRAB TRIANGLE 1.5M',
      category: 'BUNGALOW (5.5M)',
      available: 545,
      price: 2.78,
      originPrice: 220.42,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Wedge key missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Bar missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable bend on horizontal and diagonal members', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-013',
      name: 'CRAB TRIANGLE 0.7M',
      category: 'BUNGALOW (5.5M)',
      available: 574,
      price: 2.21,
      originPrice: 173.34,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Wedge key missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Bar missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable bend on horizontal and diagonal members', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-014',
      name: 'CRAB JACK BASE C60 / 600',
      category: 'BUNGALOW (5.5M)',
      available: 347,
      price: 1.30,
      originPrice: 102.74,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Thread pipe bend / dented / missing / lost', repairChargePerUnit: 0, partsLabourCostPerUnit: 21.00, costPerUnit: 21.00 },
        ],
      },
    },
    {
      itemCode: 'SC-015',
      name: 'CRAB U-HEAD C60 / 600',
      category: 'BUNGALOW (5.5M)',
      available: 347,
      price: 2.07,
      originPrice: 164.16,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Thread pipe bend / dented / missing / lost', repairChargePerUnit: 0, partsLabourCostPerUnit: 21.00, costPerUnit: 21.00 },
        ],
      },
    },
    // BUNGALOW (3.95M) items
    {
      itemCode: 'SC-016',
      name: 'CRAB STANDARD 0.50M C60',
      category: 'BUNGALOW (3.95M)',
      available: 206,
      price: 0.95,
      originPrice: 68.86,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-017',
      name: 'CRAB BRACE H1 X L0.70M',
      category: 'BUNGALOW (3.95M)',
      available: 28,
      price: 0.82,
      originPrice: 90.64,
      status: 'Low Stock',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
          { description: 'Diagonal brace fastener missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-018',
      name: 'CRAB BRACE H1 X L1.00M',
      category: 'BUNGALOW (3.95M)',
      available: 0,
      price: 0.93,
      originPrice: 98.07,
      status: 'Out of Stock',
      location: 'Warehouse B',
      itemStatus: 'Unavailable',
      damageRepairs: {
        create: [
          { description: 'Key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
          { description: 'Diagonal brace fastener missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
    {
      itemCode: 'SC-019',
      name: 'CRAB BRACE H1 X L1.50M',
      category: 'BUNGALOW (3.95M)',
      available: 17,
      price: 1.14,
      originPrice: 113.06,
      status: 'Low Stock',
      location: 'Warehouse A',
      itemStatus: 'Available',
      damageRepairs: {
        create: [
          { description: 'Key missing /lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 15.75, costPerUnit: 15.75 },
          { description: 'Diagonal brace fastener missing / lost / damaged', repairChargePerUnit: 0, partsLabourCostPerUnit: 10.50, costPerUnit: 10.50 },
          { description: 'Repairable pipe bend', repairChargePerUnit: 5.25, partsLabourCostPerUnit: 0, costPerUnit: 5.25 },
          { description: 'Major concrete cleaning', repairChargePerUnit: 2.10, partsLabourCostPerUnit: 0, costPerUnit: 2.10 },
        ],
      },
    },
  ];

  for (const item of scaffoldingItems) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).scaffoldingItem.create({ data: item });
    console.log(`  - Scaffolding Item: ${item.itemCode} - ${item.name}`);
  }

  // ========== 50 sample records (Feb 2025 – Feb 2026), all data hardcoded ==========
  const SAMPLE_AGREEMENT_NUMBERS = [
    "RA-2025-00001", "RA-2025-00002", "RA-2025-00003", "RA-2025-00004", "RA-2025-00005", "RA-2025-00006", "RA-2025-00007", "RA-2025-00008", "RA-2025-00009", "RA-2025-00010",
    "RA-2025-00011", "RA-2025-00012", "RA-2025-00013", "RA-2025-00014", "RA-2025-00015", "RA-2025-00016", "RA-2025-00017", "RA-2025-00018", "RA-2025-00019", "RA-2025-00020",
    "RA-2025-00021", "RA-2025-00022", "RA-2025-00023", "RA-2025-00024", "RA-2025-00025", "RA-2025-00026", "RA-2025-00027", "RA-2025-00028", "RA-2025-00029", "RA-2025-00030",
    "RA-2025-00031", "RA-2025-00032", "RA-2025-00033", "RA-2025-00034", "RA-2025-00035", "RA-2025-00036", "RA-2025-00037", "RA-2025-00038", "RA-2025-00039", "RA-2025-00040",
    "RA-2025-00041", "RA-2025-00042", "RA-2025-00043", "RA-2025-00044", "RA-2025-00045", "RA-2025-00046", "RA-2025-00047", "RA-2025-00048", "RA-2025-00049", "RA-2025-00050",
  ];
  const SAMPLE_DO_NUMBERS = [
    "DO-20250201-00001", "DO-20250208-00002", "DO-20250215-00003", "DO-20250222-00004", "DO-20250301-00005",
    "DO-20250308-00006", "DO-20250315-00007", "DO-20250322-00008", "DO-20250401-00009", "DO-20250408-00010",
    "DO-20250415-00011", "DO-20250422-00012", "DO-20250501-00013", "DO-20250508-00014", "DO-20250515-00015",
    "DO-20250522-00016", "DO-20250601-00017", "DO-20250608-00018", "DO-20250615-00019", "DO-20250622-00020",
    "DO-20250701-00021", "DO-20250708-00022", "DO-20250715-00023", "DO-20250722-00024", "DO-20250801-00025",
    "DO-20250808-00026", "DO-20250815-00027", "DO-20250822-00028", "DO-20250901-00029", "DO-20250908-00030",
    "DO-20250915-00031", "DO-20250922-00032", "DO-20251001-00033", "DO-20251008-00034", "DO-20251015-00035",
    "DO-20251022-00036", "DO-20251101-00037", "DO-20251108-00038", "DO-20251115-00039", "DO-20251122-00040",
    "DO-20251201-00041", "DO-20251208-00042", "DO-20251215-00043", "DO-20251222-00044", "DO-20260101-00045",
    "DO-20260108-00046", "DO-20260115-00047", "DO-20260122-00048", "DO-20260201-00049", "DO-20260215-00050",
  ];
  const SAMPLE_RCF_NUMBERS = [
    "RCF-2025-00001", "RCF-2025-00002", "RCF-2025-00003", "RCF-2025-00004", "RCF-2025-00005", "RCF-2025-00006", "RCF-2025-00007", "RCF-2025-00008", "RCF-2025-00009", "RCF-2025-00010",
    "RCF-2025-00011", "RCF-2025-00012", "RCF-2025-00013", "RCF-2025-00014", "RCF-2025-00015", "RCF-2025-00016", "RCF-2025-00017", "RCF-2025-00018", "RCF-2025-00019", "RCF-2025-00020",
    "RCF-2025-00021", "RCF-2025-00022", "RCF-2025-00023", "RCF-2025-00024", "RCF-2025-00025", "RCF-2025-00026", "RCF-2025-00027", "RCF-2025-00028", "RCF-2025-00029", "RCF-2025-00030",
    "RCF-2025-00031", "RCF-2025-00032", "RCF-2025-00033", "RCF-2025-00034", "RCF-2025-00035", "RCF-2025-00036", "RCF-2025-00037", "RCF-2025-00038", "RCF-2025-00039", "RCF-2025-00040",
    "RCF-2025-00041", "RCF-2025-00042", "RCF-2025-00043", "RCF-2025-00044", "RCF-2025-00045", "RCF-2025-00046", "RCF-2025-00047", "RCF-2025-00048", "RCF-2025-00049", "RCF-2025-00050",
  ];
  const SAMPLE_DEPOSIT_NUMBERS = [
    "DEP-20250201-00001", "DEP-20250208-00002", "DEP-20250215-00003", "DEP-20250222-00004", "DEP-20250301-00005",
    "DEP-20250308-00006", "DEP-20250315-00007", "DEP-20250322-00008", "DEP-20250401-00009", "DEP-20250408-00010",
    "DEP-20250415-00011", "DEP-20250422-00012", "DEP-20250501-00013", "DEP-20250508-00014", "DEP-20250515-00015",
    "DEP-20250522-00016", "DEP-20250601-00017", "DEP-20250608-00018", "DEP-20250615-00019", "DEP-20250622-00020",
    "DEP-20250701-00021", "DEP-20250708-00022", "DEP-20250715-00023", "DEP-20250722-00024", "DEP-20250801-00025",
    "DEP-20250808-00026", "DEP-20250815-00027", "DEP-20250822-00028", "DEP-20250901-00029", "DEP-20250908-00030",
    "DEP-20250915-00031", "DEP-20250922-00032", "DEP-20251001-00033", "DEP-20251008-00034", "DEP-20251015-00035",
    "DEP-20251022-00036", "DEP-20251101-00037", "DEP-20251108-00038", "DEP-20251115-00039", "DEP-20251122-00040",
    "DEP-20251201-00041", "DEP-20251208-00042", "DEP-20251215-00043", "DEP-20251222-00044", "DEP-20260101-00045",
    "DEP-20260108-00046", "DEP-20260115-00047", "DEP-20260122-00048", "DEP-20260201-00049", "DEP-20260215-00050",
  ];
  const SAMPLE_DELIVERY_REQUEST_DATES = [
    "2025-02-05", "2025-02-12", "2025-02-19", "2025-02-26", "2025-03-05", "2025-03-12", "2025-03-19", "2025-03-26", "2025-04-05", "2025-04-12",
    "2025-04-19", "2025-04-26", "2025-05-05", "2025-05-12", "2025-05-19", "2025-05-26", "2025-06-05", "2025-06-12", "2025-06-19", "2025-06-26",
    "2025-07-05", "2025-07-12", "2025-07-19", "2025-07-26", "2025-08-05", "2025-08-12", "2025-08-19", "2025-08-26", "2025-09-05", "2025-09-12",
    "2025-09-19", "2025-09-26", "2025-10-05", "2025-10-12", "2025-10-19", "2025-10-26", "2025-11-05", "2025-11-12", "2025-11-19", "2025-11-26",
    "2025-12-05", "2025-12-12", "2025-12-19", "2025-12-26", "2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26", "2026-02-05", "2026-02-20",
  ];
  const SAMPLE_INSPECTION_DATES = [
    "2025-02-10", "2025-02-17", "2025-02-24", "2025-03-03", "2025-03-10", "2025-03-17", "2025-03-24", "2025-03-31", "2025-04-10", "2025-04-17",
    "2025-04-24", "2025-05-01", "2025-05-10", "2025-05-17", "2025-05-24", "2025-05-31", "2025-06-10", "2025-06-17", "2025-06-24", "2025-07-01",
    "2025-07-10", "2025-07-17", "2025-07-24", "2025-07-31", "2025-08-10", "2025-08-17", "2025-08-24", "2025-08-31", "2025-09-10", "2025-09-17",
    "2025-09-24", "2025-10-01", "2025-10-10", "2025-10-17", "2025-10-24", "2025-10-31", "2025-11-10", "2025-11-17", "2025-11-24", "2025-12-01",
    "2025-12-10", "2025-12-17", "2025-12-24", "2025-12-31", "2026-01-10", "2026-01-17", "2026-01-24", "2026-01-31", "2026-02-10", "2026-02-22",
  ];
  const SAMPLE_DEPOSIT_DUE_DATES = [
    "2025-02-15", "2025-02-22", "2025-03-01", "2025-03-08", "2025-03-15", "2025-03-22", "2025-03-29", "2025-04-05", "2025-04-15", "2025-04-22",
    "2025-04-29", "2025-05-06", "2025-05-15", "2025-05-22", "2025-05-29", "2025-06-05", "2025-06-15", "2025-06-22", "2025-06-29", "2025-07-06",
    "2025-07-15", "2025-07-22", "2025-07-29", "2025-08-05", "2025-08-15", "2025-08-22", "2025-08-29", "2025-09-05", "2025-09-15", "2025-09-22",
    "2025-09-29", "2025-10-06", "2025-10-15", "2025-10-22", "2025-10-29", "2025-11-05", "2025-11-15", "2025-11-22", "2025-11-29", "2025-12-06",
    "2025-12-15", "2025-12-22", "2025-12-29", "2026-01-05", "2026-01-15", "2026-01-22", "2026-01-29", "2026-02-05", "2026-02-15", "2026-02-25",
  ];
  const SAMPLE_DEPOSIT_APPROVED_DATES = [
    "2025-02-17", "2025-02-24", "2025-03-03", "2025-03-10", "2025-03-17", "2025-03-24", "2025-03-31", "2025-04-07", "2025-04-17", "2025-04-24",
    "2025-05-01", "2025-05-08", "2025-05-17", "2025-05-24", "2025-05-31", "2025-06-07", "2025-06-17", "2025-06-24", "2025-07-01", "2025-07-08",
    "2025-07-17", "2025-07-24", "2025-07-31", "2025-08-07", "2025-08-17", "2025-08-24", "2025-08-31", "2025-09-07", "2025-09-17", "2025-09-24",
    "2025-10-01", "2025-10-08", "2025-10-17", "2025-10-24", "2025-10-31", "2025-11-07", "2025-11-17", "2025-11-24", "2025-12-01", "2025-12-08",
    "2025-12-17", "2025-12-24", "2025-12-31", "2026-01-07", "2026-01-17", "2026-01-24", "2026-01-31", "2026-02-07", "2026-02-17", "2026-02-27",
  ];
  const SAMPLE_DELIVERY_TYPES = ["Full", "Partial", "Partial", "Full", "Partial", "Partial", "Full", "Partial", "Partial", "Full",
    "Partial", "Partial", "Full", "Partial", "Partial", "Full", "Partial", "Partial", "Full", "Partial",
    "Partial", "Full", "Partial", "Partial", "Full", "Partial", "Partial", "Full", "Partial", "Partial",
    "Full", "Partial", "Partial", "Full", "Partial", "Partial", "Full", "Partial", "Partial", "Full",
    "Partial", "Partial", "Full", "Partial", "Partial", "Full", "Partial", "Partial", "Full", "Partial"];
  const SAMPLE_TOTAL_SETS = [1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 2, 3, 1, 2, 2, 1, 2, 3, 1, 2];
  const SAMPLE_TOTAL_RENTAL_MONTHS = [3, 4, 5, 3, 4, 6, 3, 4, 5, 3, 4, 6, 3, 4, 5, 3, 4, 6, 3, 4, 5, 3, 4, 6, 3, 4, 5, 3, 4, 6, 3, 4, 5, 3, 4, 6, 3, 4, 5, 3, 4, 6, 3, 4, 5, 3, 4, 6, 3, 4];
  // Return request sample data (50 each)
  const SAMPLE_RETURN_REQUEST_IDS = [
    "RET-20250210-00001", "RET-20250217-00002", "RET-20250224-00003", "RET-20250303-00004", "RET-20250310-00005",
    "RET-20250317-00006", "RET-20250324-00007", "RET-20250331-00008", "RET-20250410-00009", "RET-20250417-00010",
    "RET-20250424-00011", "RET-20250501-00012", "RET-20250510-00013", "RET-20250517-00014", "RET-20250524-00015",
    "RET-20250531-00016", "RET-20250610-00017", "RET-20250617-00018", "RET-20250624-00019", "RET-20250701-00020",
    "RET-20250710-00021", "RET-20250717-00022", "RET-20250724-00023", "RET-20250731-00024", "RET-20250810-00025",
    "RET-20250817-00026", "RET-20250824-00027", "RET-20250831-00028", "RET-20250910-00029", "RET-20250917-00030",
    "RET-20250924-00031", "RET-20251001-00032", "RET-20251010-00033", "RET-20251017-00034", "RET-20251024-00035",
    "RET-20251031-00036", "RET-20251110-00037", "RET-20251117-00038", "RET-20251124-00039", "RET-20251201-00040",
    "RET-20251210-00041", "RET-20251217-00042", "RET-20251224-00043", "RET-20251231-00044", "RET-20260110-00045",
    "RET-20260117-00046", "RET-20260124-00047", "RET-20260131-00048", "RET-20260210-00049", "RET-20260222-00050",
  ];
  const SAMPLE_RETURN_REQUEST_DATES = [
    "2025-02-10", "2025-02-17", "2025-02-24", "2025-03-03", "2025-03-10", "2025-03-17", "2025-03-24", "2025-03-31", "2025-04-10", "2025-04-17",
    "2025-04-24", "2025-05-01", "2025-05-10", "2025-05-17", "2025-05-24", "2025-05-31", "2025-06-10", "2025-06-17", "2025-06-24", "2025-07-01",
    "2025-07-10", "2025-07-17", "2025-07-24", "2025-07-31", "2025-08-10", "2025-08-17", "2025-08-24", "2025-08-31", "2025-09-10", "2025-09-17",
    "2025-09-24", "2025-10-01", "2025-10-10", "2025-10-17", "2025-10-24", "2025-10-31", "2025-11-10", "2025-11-17", "2025-11-24", "2025-12-01",
    "2025-12-10", "2025-12-17", "2025-12-24", "2025-12-31", "2026-01-10", "2026-01-17", "2026-01-24", "2026-01-31", "2026-02-10", "2026-02-22",
  ];
  const SAMPLE_RETURN_REASONS = [
    "Project completed", "Rental period ended", "Project completed", "Early termination", "Project completed",
    "Rental period ended", "Project completed", "Project completed", "Rental period ended", "Project completed",
    "Early termination", "Project completed", "Rental period ended", "Project completed", "Project completed",
    "Rental period ended", "Project completed", "Early termination", "Project completed", "Rental period ended",
    "Project completed", "Project completed", "Rental period ended", "Project completed", "Early termination",
    "Project completed", "Rental period ended", "Project completed", "Project completed", "Rental period ended",
    "Project completed", "Early termination", "Project completed", "Rental period ended", "Project completed",
    "Project completed", "Rental period ended", "Project completed", "Early termination", "Project completed",
    "Rental period ended", "Project completed", "Project completed", "Rental period ended", "Project completed",
    "Early termination", "Project completed", "Rental period ended", "Project completed", "Project completed",
  ];
  const SAMPLE_RETURN_TYPES = ["Full", "Full", "Partial", "Full", "Full", "Partial", "Full", "Full", "Partial", "Full",
    "Full", "Partial", "Full", "Full", "Partial", "Full", "Full", "Full", "Partial", "Full",
    "Partial", "Full", "Full", "Partial", "Full", "Full", "Partial", "Full", "Full", "Partial",
    "Full", "Full", "Partial", "Full", "Full", "Partial", "Full", "Full", "Full", "Partial",
    "Full", "Full", "Partial", "Full", "Full", "Partial", "Full", "Full", "Partial", "Full"];
  const SAMPLE_COLLECTION_METHODS = ["Transportation Needed", "Self Return", "Transportation Needed", "Self Return", "Transportation Needed",
    "Self Return", "Transportation Needed", "Self Return", "Transportation Needed", "Self Return",
    "Transportation Needed", "Self Return", "Transportation Needed", "Self Return", "Transportation Needed",
    "Self Return", "Transportation Needed", "Self Return", "Transportation Needed", "Self Return",
    "Transportation Needed", "Self Return", "Transportation Needed", "Self Return", "Transportation Needed",
    "Self Return", "Transportation Needed", "Self Return", "Transportation Needed", "Self Return",
    "Transportation Needed", "Self Return", "Transportation Needed", "Self Return", "Transportation Needed",
    "Self Return", "Transportation Needed", "Self Return", "Transportation Needed", "Self Return",
    "Transportation Needed", "Self Return", "Transportation Needed", "Self Return", "Transportation Needed",
    "Self Return", "Transportation Needed", "Self Return", "Transportation Needed", "Self Return"];

  // Billing sample data (50 each): monthly invoices, additional charges, credit notes, refunds
  const SAMPLE_MRI_NUMBERS = [
    "MRI-20250201-001", "MRI-20250208-002", "MRI-20250215-003", "MRI-20250222-004", "MRI-20250301-005",
    "MRI-20250308-006", "MRI-20250315-007", "MRI-20250322-008", "MRI-20250401-009", "MRI-20250408-010",
    "MRI-20250415-011", "MRI-20250422-012", "MRI-20250501-013", "MRI-20250508-014", "MRI-20250515-015",
    "MRI-20250522-016", "MRI-20250601-017", "MRI-20250608-018", "MRI-20250615-019", "MRI-20250622-020",
    "MRI-20250701-021", "MRI-20250708-022", "MRI-20250715-023", "MRI-20250722-024", "MRI-20250801-025",
    "MRI-20250808-026", "MRI-20250815-027", "MRI-20250822-028", "MRI-20250901-029", "MRI-20250908-030",
    "MRI-20250915-031", "MRI-20250922-032", "MRI-20251001-033", "MRI-20251008-034", "MRI-20251015-035",
    "MRI-20251022-036", "MRI-20251101-037", "MRI-20251108-038", "MRI-20251115-039", "MRI-20251122-040",
    "MRI-20251201-041", "MRI-20251208-042", "MRI-20251215-043", "MRI-20251222-044", "MRI-20260101-045",
    "MRI-20260108-046", "MRI-20260115-047", "MRI-20260122-048", "MRI-20260201-049", "MRI-20260215-050",
  ];
  const SAMPLE_BILLING_MONTHS = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 1, 1, 1, 1, 2, 2];
  const SAMPLE_BILLING_YEARS = [2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2026, 2026, 2026, 2026, 2026, 2026];
  const SAMPLE_MRI_DUE_DATES = [
    "2025-02-15", "2025-02-22", "2025-03-01", "2025-03-08", "2025-03-15", "2025-03-22", "2025-03-29", "2025-04-05", "2025-04-15", "2025-04-22",
    "2025-04-29", "2025-05-06", "2025-05-15", "2025-05-22", "2025-05-29", "2025-06-05", "2025-06-15", "2025-06-22", "2025-06-29", "2025-07-06",
    "2025-07-15", "2025-07-22", "2025-07-29", "2025-08-05", "2025-08-15", "2025-08-22", "2025-08-29", "2025-09-05", "2025-09-15", "2025-09-22",
    "2025-09-29", "2025-10-06", "2025-10-15", "2025-10-22", "2025-10-29", "2025-11-05", "2025-11-15", "2025-11-22", "2025-11-29", "2025-12-06",
    "2025-12-15", "2025-12-22", "2025-12-29", "2026-01-05", "2026-01-15", "2026-01-22", "2026-01-29", "2026-02-05", "2026-02-15", "2026-02-25",
  ];
  const SAMPLE_AC_INVOICE_NOS = [
    "AC-20250210-001", "AC-20250217-002", "AC-20250224-003", "AC-20250303-004", "AC-20250310-005",
    "AC-20250317-006", "AC-20250324-007", "AC-20250331-008", "AC-20250410-009", "AC-20250417-010",
    "AC-20250424-011", "AC-20250501-012", "AC-20250510-013", "AC-20250517-014", "AC-20250524-015",
    "AC-20250531-016", "AC-20250610-017", "AC-20250617-018", "AC-20250624-019", "AC-20250701-020",
    "AC-20250710-021", "AC-20250717-022", "AC-20250724-023", "AC-20250731-024", "AC-20250810-025",
    "AC-20250817-026", "AC-20250824-027", "AC-20250831-028", "AC-20250910-029", "AC-20250917-030",
    "AC-20250924-031", "AC-20251001-032", "AC-20251010-033", "AC-20251017-034", "AC-20251024-035",
    "AC-20251031-036", "AC-20251110-037", "AC-20251117-038", "AC-20251124-039", "AC-20251201-040",
    "AC-20251210-041", "AC-20251217-042", "AC-20251224-043", "AC-20251231-044", "AC-20260110-045",
    "AC-20260117-046", "AC-20260124-047", "AC-20260131-048", "AC-20260210-049", "AC-20260222-050",
  ];
  const SAMPLE_AC_DUE_DATES = [
    "2025-02-20", "2025-02-27", "2025-03-06", "2025-03-13", "2025-03-20", "2025-03-27", "2025-04-03", "2025-04-10", "2025-04-20", "2025-04-27",
    "2025-05-04", "2025-05-11", "2025-05-20", "2025-05-27", "2025-06-03", "2025-06-10", "2025-06-20", "2025-06-27", "2025-07-04", "2025-07-11",
    "2025-07-20", "2025-07-27", "2025-08-03", "2025-08-10", "2025-08-20", "2025-08-27", "2025-09-03", "2025-09-10", "2025-09-20", "2025-09-27",
    "2025-10-04", "2025-10-11", "2025-10-20", "2025-10-27", "2025-11-03", "2025-11-10", "2025-11-20", "2025-11-27", "2025-12-04", "2025-12-11",
    "2025-12-20", "2025-12-27", "2026-01-03", "2026-01-10", "2026-01-20", "2026-01-27", "2026-02-03", "2026-02-10", "2026-02-20", "2026-03-01",
  ];
  const SAMPLE_CN_NUMBERS = [
    "CN-2025-001", "CN-2025-002", "CN-2025-003", "CN-2025-004", "CN-2025-005", "CN-2025-006", "CN-2025-007", "CN-2025-008", "CN-2025-009", "CN-2025-010",
    "CN-2025-011", "CN-2025-012", "CN-2025-013", "CN-2025-014", "CN-2025-015", "CN-2025-016", "CN-2025-017", "CN-2025-018", "CN-2025-019", "CN-2025-020",
    "CN-2025-021", "CN-2025-022", "CN-2025-023", "CN-2025-024", "CN-2025-025", "CN-2025-026", "CN-2025-027", "CN-2025-028", "CN-2025-029", "CN-2025-030",
    "CN-2025-031", "CN-2025-032", "CN-2025-033", "CN-2025-034", "CN-2025-035", "CN-2025-036", "CN-2025-037", "CN-2025-038", "CN-2025-039", "CN-2025-040",
    "CN-2025-041", "CN-2025-042", "CN-2025-043", "CN-2025-044", "CN-2025-045", "CN-2026-046", "CN-2026-047", "CN-2026-048", "CN-2026-049", "CN-2026-050",
  ];
  const SAMPLE_CN_DATES = [
    "2025-02-12", "2025-02-19", "2025-02-26", "2025-03-05", "2025-03-12", "2025-03-19", "2025-03-26", "2025-04-02", "2025-04-12", "2025-04-19",
    "2025-04-26", "2025-05-03", "2025-05-12", "2025-05-19", "2025-05-26", "2025-06-02", "2025-06-12", "2025-06-19", "2025-06-26", "2025-07-03",
    "2025-07-12", "2025-07-19", "2025-07-26", "2025-08-02", "2025-08-12", "2025-08-19", "2025-08-26", "2025-09-02", "2025-09-12", "2025-09-19",
    "2025-09-26", "2025-10-03", "2025-10-12", "2025-10-19", "2025-10-26", "2025-11-02", "2025-11-12", "2025-11-19", "2025-11-26", "2025-12-03",
    "2025-12-12", "2025-12-19", "2025-12-26", "2026-01-02", "2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-12", "2026-02-24",
  ];
  const SAMPLE_CN_REASONS = ["Returned Items", "Price Adjustment", "Returned Items", "Billing Error", "Service Issue", "Returned Items", "Price Adjustment", "Damaged Goods", "Returned Items", "Billing Error",
    "Service Issue", "Returned Items", "Price Adjustment", "Other", "Returned Items", "Billing Error", "Price Adjustment", "Returned Items", "Damaged Goods", "Service Issue",
    "Returned Items", "Price Adjustment", "Billing Error", "Returned Items", "Other", "Returned Items", "Price Adjustment", "Service Issue", "Returned Items", "Billing Error",
    "Price Adjustment", "Returned Items", "Damaged Goods", "Returned Items", "Other", "Returned Items", "Price Adjustment", "Billing Error", "Returned Items", "Service Issue",
    "Returned Items", "Price Adjustment", "Other", "Returned Items", "Billing Error", "Returned Items", "Price Adjustment", "Returned Items", "Damaged Goods", "Returned Items"];
  const SAMPLE_REFUND_NUMBERS = [
    "REF-2025-001", "REF-2025-002", "REF-2025-003", "REF-2025-004", "REF-2025-005", "REF-2025-006", "REF-2025-007", "REF-2025-008", "REF-2025-009", "REF-2025-010",
    "REF-2025-011", "REF-2025-012", "REF-2025-013", "REF-2025-014", "REF-2025-015", "REF-2025-016", "REF-2025-017", "REF-2025-018", "REF-2025-019", "REF-2025-020",
    "REF-2025-021", "REF-2025-022", "REF-2025-023", "REF-2025-024", "REF-2025-025", "REF-2025-026", "REF-2025-027", "REF-2025-028", "REF-2025-029", "REF-2025-030",
    "REF-2025-031", "REF-2025-032", "REF-2025-033", "REF-2025-034", "REF-2025-035", "REF-2025-036", "REF-2025-037", "REF-2025-038", "REF-2025-039", "REF-2025-040",
    "REF-2025-041", "REF-2025-042", "REF-2025-043", "REF-2025-044", "REF-2025-045", "REF-2026-046", "REF-2026-047", "REF-2026-048", "REF-2026-049", "REF-2026-050",
  ];

  const customerRoleForSamples = await prisma.role.findUnique({ where: { name: "customer" } });
  if (!customerRoleForSamples) throw new Error("customer role not found");
  const malaysiaCustomers = await prisma.user.findMany({
    where: {
      roles: { some: { roleId: customerRoleForSamples.id } },
      OR: [{ phone: { startsWith: "+60" } }, { email: { contains: ".my" } }, { email: { endsWith: "@email.com" } }],
    },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true },
  });
  if (malaysiaCustomers.length === 0) {
    const allCustomers = await prisma.user.findMany({
      where: { roles: { some: { roleId: customerRoleForSamples.id } } },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });
    malaysiaCustomers.push(...allCustomers);
  }
  const salesUser = await prisma.user.findFirst({
    where: { email: "sales@powermetalsteel.com" },
    select: { id: true },
  });
  if (!salesUser) throw new Error("sales user not found for createdBy");
  const scaffoldingItemList = await (prisma as any).scaffoldingItem.findMany({
    select: { id: true, itemCode: true, name: true, price: true },
    where: { status: { not: "Out of Stock" } },
  });
  if (scaffoldingItemList.length === 0) throw new Error("no scaffolding items available");
  const siByCode = Object.fromEntries(scaffoldingItemList.map((si: { itemCode: string }) => [si.itemCode, si]));

  // Hardcoded sample data (50 each): RFQ numbers, dates, customer index, projects, locations, notes, and line items
  const SAMPLE_RFQ_NUMBERS = [
    "RFQ-20250201-00001", "RFQ-20250208-00002", "RFQ-20250215-00003", "RFQ-20250222-00004", "RFQ-20250301-00005",
    "RFQ-20250308-00006", "RFQ-20250315-00007", "RFQ-20250322-00008", "RFQ-20250401-00009", "RFQ-20250408-00010",
    "RFQ-20250415-00011", "RFQ-20250422-00012", "RFQ-20250501-00013", "RFQ-20250508-00014", "RFQ-20250515-00015",
    "RFQ-20250522-00016", "RFQ-20250601-00017", "RFQ-20250608-00018", "RFQ-20250615-00019", "RFQ-20250622-00020",
    "RFQ-20250701-00021", "RFQ-20250708-00022", "RFQ-20250715-00023", "RFQ-20250722-00024", "RFQ-20250801-00025",
    "RFQ-20250808-00026", "RFQ-20250815-00027", "RFQ-20250822-00028", "RFQ-20250901-00029", "RFQ-20250908-00030",
    "RFQ-20250915-00031", "RFQ-20250922-00032", "RFQ-20251001-00033", "RFQ-20251008-00034", "RFQ-20251015-00035",
    "RFQ-20251022-00036", "RFQ-20251101-00037", "RFQ-20251108-00038", "RFQ-20251115-00039", "RFQ-20251122-00040",
    "RFQ-20251201-00041", "RFQ-20251208-00042", "RFQ-20251215-00043", "RFQ-20251222-00044", "RFQ-20260101-00045",
    "RFQ-20260108-00046", "RFQ-20260115-00047", "RFQ-20260122-00048", "RFQ-20260201-00049", "RFQ-20260215-00050",
  ];
  const SAMPLE_REQUESTED_DATES = [
    "2025-02-01", "2025-02-08", "2025-02-15", "2025-02-22", "2025-03-01", "2025-03-08", "2025-03-15", "2025-03-22", "2025-04-01", "2025-04-08",
    "2025-04-15", "2025-04-22", "2025-05-01", "2025-05-08", "2025-05-15", "2025-05-22", "2025-06-01", "2025-06-08", "2025-06-15", "2025-06-22",
    "2025-07-01", "2025-07-08", "2025-07-15", "2025-07-22", "2025-08-01", "2025-08-08", "2025-08-15", "2025-08-22", "2025-09-01", "2025-09-08",
    "2025-09-15", "2025-09-22", "2025-10-01", "2025-10-08", "2025-10-15", "2025-10-22", "2025-11-01", "2025-11-08", "2025-11-15", "2025-11-22",
    "2025-12-01", "2025-12-08", "2025-12-15", "2025-12-22", "2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22", "2026-02-01", "2026-02-15",
  ];
  const SAMPLE_CUSTOMER_INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1];
  const SAMPLE_PROJECT_NAMES = [
    "Tower A Residency KL", "PJ Trade Centre Phase 2", "Iskandar Data Centre", "Cyberjaya Tech Hub", "Shah Alam Logistics Park",
    "Johor Port Expansion", "Penang Bridge Maintenance", "Kuantan Industrial Zone", "Seremban Mixed Development", "Kota Kinabalu Waterfront",
    "Kuching Central Mall", "Ipoh Hospital Extension", "Melaka Heritage Site Restoration", "Kota Bharu Civic Centre", "Alor Setar Transport Hub",
    "Kangar Government Complex", "Kota Tinggi Housing", "Segamat Industrial", "Kulai Warehouse", "Pasir Gudang Refinery Upgrade",
    "Klang Port Upgrade", "Rawang Bypass", "Kajang MRT Depot", "Putrajaya Government Tower", "Sepang F1 Circuit Upgrade",
    "Port Dickson Resort", "Nilai Industrial", "Senawang Logistics", "Banting Highway", "Selayang Hospital",
    "Ampang Flood Mitigation", "Cheras Commercial Block", "Kepong Residential", "Damansara Office Tower", "Mont Kiara Mixed",
    "Bangsar South Tower", "KLCC Link Bridge", "TRX Financial District", "Bandar Malaysia Phase 1", "Sungai Buloh MRT Depot",
    "Puchong LRT Extension", "Subang Airport Upgrade", "Putra Heights Transit", "Kinrara Industrial", "Puchong Utama Commercial",
    "Seri Kembangan Housing", "Balakong Warehouse", "Semenyih Dam Maintenance", "Hulu Langat Water Plant", "Bangi Research Centre", "Salak South Depot",
  ];
  const SAMPLE_LOCATIONS = [
    "Kuala Lumpur", "Petaling Jaya, Selangor", "Iskandar Puteri, Johor", "Cyberjaya, Selangor", "Shah Alam, Selangor",
    "Pasir Gudang, Johor", "George Town, Penang", "Kuantan, Pahang", "Seremban, Negeri Sembilan", "Kota Kinabalu, Sabah",
    "Kuching, Sarawak", "Ipoh, Perak", "Melaka", "Kota Bharu, Kelantan", "Alor Setar, Kedah", "Kangar, Perlis", "Kota Tinggi, Johor",
    "Segamat, Johor", "Kulai, Johor", "Klang, Selangor", "Rawang, Selangor", "Kajang, Selangor", "Putrajaya", "Sepang, Selangor",
    "Port Dickson, N.Sembilan", "Nilai, N.Sembilan", "Senawang, N.Sembilan", "Banting, Selangor", "Selayang, Selangor", "Ampang, Selangor",
    "Cheras, Kuala Lumpur", "Kepong, Kuala Lumpur", "Damansara, Petaling Jaya", "Mont Kiara, Kuala Lumpur", "Bangsar, Kuala Lumpur",
    "KLCC, Kuala Lumpur", "TRX, Kuala Lumpur", "Bandar Malaysia, Kuala Lumpur", "Sungai Buloh, Selangor", "Puchong, Selangor",
    "Subang, Selangor", "Putra Heights, Selangor", "Kinrara, Puchong", "Puchong Utama, Puchong", "Seri Kembangan, Selangor", "Balakong, Cheras",
    "Semenyih, Selangor", "Hulu Langat, Selangor", "Bangi, Selangor", "Salak South, Kuala Lumpur",
  ];
  const SAMPLE_NOTES: (string | null)[] = [
    "Urgent delivery requested.", null, null, "Urgent delivery requested.", null, null, null, "Urgent delivery requested.", null, null,
    null, "Urgent delivery requested.", null, null, null, "Urgent delivery requested.", null, null, null, null,
    "Urgent delivery requested.", null, null, null, null, null, "Urgent delivery requested.", null, null, null,
    null, "Urgent delivery requested.", null, null, null, null, null, "Urgent delivery requested.", null, null,
    null, null, "Urgent delivery requested.", null, null, null, null, null, "Urgent delivery requested.", null,
  ];
  // Per-RFQ line items: itemCode, setName, requiredDateOffsetDays, rentalMonths, quantity (totalPrice = quantity * unitPrice * rentalMonths * 30)
  const SAMPLE_RFQ_ITEMS: { itemCode: string; setName: string; requiredDateOffsetDays: number; rentalMonths: number; quantity: number }[][] = (() => {
    const codes = ["SC-001", "SC-002", "SC-003", "SC-004", "SC-005", "SC-006", "SC-007", "SC-008", "SC-009", "SC-010", "SC-011", "SC-012", "SC-013", "SC-014", "SC-015", "SC-016", "SC-017", "SC-019"];
    const out: { itemCode: string; setName: string; requiredDateOffsetDays: number; rentalMonths: number; quantity: number }[][] = [];
    for (let i = 0; i < 50; i++) {
      const numSets = i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3;
      const rentalMonths = (i % 6) + 1;
      const items: { itemCode: string; setName: string; requiredDateOffsetDays: number; rentalMonths: number; quantity: number }[] = [];
      for (let s = 0; s < numSets; s++) {
        const setName = `Set ${s + 1}`;
        const offset = s + 1;
        const numItems = 2 + (i % 4);
        for (let k = 0; k < numItems; k++) {
          items.push({
            itemCode: codes[(i + s + k) % codes.length],
            setName,
            requiredDateOffsetDays: offset,
            rentalMonths,
            quantity: 10 + (i * 3 + s * 2 + k) % 91,
          });
        }
      }
      out.push(items);
    }
    return out;
  })();

  console.log("Creating 50 RFQs with items (Feb 2025 – Feb 2026)...");
  const createdRfqs: { id: string; rfqNumber: string; totalAmount: number; customerName: string; customerEmail: string; customerPhone: string | null; projectName: string; projectLocation: string }[] = [];
  for (let i = 0; i < 50; i++) {
    const requestedDate = new Date(SAMPLE_REQUESTED_DATES[i] + "T00:00:00.000Z");
    const custIdx = SAMPLE_CUSTOMER_INDEX[i] % malaysiaCustomers.length;
    const cust = malaysiaCustomers[custIdx];
    const customerName = [cust.firstName, cust.lastName].filter(Boolean).join(" ") || cust.email;
    const customerEmail = cust.email;
    const customerPhone = cust.phone ?? "";
    const projectName = SAMPLE_PROJECT_NAMES[i];
    const projectLocation = SAMPLE_LOCATIONS[i];
    const itemRows: { setName: string; requiredDate: Date; rentalMonths: number; scaffoldingItemId: string; scaffoldingItemName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }[] = [];
    let totalAmount = 0;
    for (const row of SAMPLE_RFQ_ITEMS[i]) {
      const si = (siByCode as Record<string, { id: string; name: string; price: unknown }>)[row.itemCode];
      if (!si) continue;
      const requiredDate = new Date(requestedDate.getTime() + row.requiredDateOffsetDays * 24 * 60 * 60 * 1000);
      const unitPrice = Number(si.price);
      const totalPrice = row.quantity * unitPrice * row.rentalMonths * 30;
      itemRows.push({
        setName: row.setName,
        requiredDate,
        rentalMonths: row.rentalMonths,
        scaffoldingItemId: si.id,
        scaffoldingItemName: si.name,
        quantity: row.quantity,
        unit: "piece",
        unitPrice,
        totalPrice,
      });
      totalAmount += totalPrice;
    }
    const rfq = await prisma.rFQ.create({
      data: {
        rfqNumber: SAMPLE_RFQ_NUMBERS[i],
        customerName,
        customerEmail,
        customerPhone,
        projectName,
        projectLocation,
        requestedDate,
        status: "approved",
        totalAmount,
        notes: SAMPLE_NOTES[i],
        createdBy: salesUser.id,
      },
    });
    await prisma.rFQItem.createMany({
      data: itemRows.map((row) => ({
        rfqId: rfq.id,
        setName: row.setName,
        requiredDate: row.requiredDate,
        rentalMonths: row.rentalMonths,
        scaffoldingItemId: row.scaffoldingItemId,
        scaffoldingItemName: row.scaffoldingItemName,
        quantity: row.quantity,
        unit: row.unit,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice,
      })),
    });
    createdRfqs.push({
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      totalAmount: Number(rfq.totalAmount),
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      projectName,
      projectLocation,
    });
  }
  console.log(`  - Created ${createdRfqs.length} RFQs with items.`);

  console.log("Creating 50 RentalAgreements linked to RFQs...");
  const createdAgreements: { id: string; agreementNumber: string; rfqId: string; projectName: string; hirer: string; securityDeposit: number }[] = [];
  for (let i = 0; i < 50; i++) {
    const rfq = createdRfqs[i];
    const totalRentalMonths = SAMPLE_TOTAL_RENTAL_MONTHS[i];
    const securityDepositAmount = Math.round(rfq.totalAmount * 0.1 * 100) / 100;
    const agreement = await prisma.rentalAgreement.create({
      data: {
        agreementNumber: SAMPLE_AGREEMENT_NUMBERS[i],
        projectName: rfq.projectName,
        owner: "Power Metal Steel Sdn Bhd",
        hirer: rfq.customerName,
        location: rfq.projectLocation,
        totalRentalMonth: totalRentalMonths,
        monthlyRental: Math.round((rfq.totalAmount / Math.max(1, totalRentalMonths)) * 100) / 100,
        securityDeposit: securityDepositAmount,
        minimumCharges: 0,
        defaultInterest: 0,
        status: "Completed",
        signedStatus: "completed",
        currentVersion: 1,
        createdBy: salesUser.id,
        rfqId: rfq.id,
      },
    });
    const rfqItems = await prisma.rFQItem.findMany({ where: { rfqId: rfq.id } });
    for (const it of rfqItems) {
      await prisma.agreementItem.create({
        data: {
          agreementId: agreement.id,
          rfqItemId: it.id,
          scaffoldingItemId: it.scaffoldingItemId,
          scaffoldingItemName: it.scaffoldingItemName,
          agreedMonthlyRate: Number(it.unitPrice) * 30,
          minimumRentalMonths: it.rentalMonths,
        },
      });
    }
    createdAgreements.push({
      id: agreement.id,
      agreementNumber: agreement.agreementNumber,
      rfqId: rfq.id,
      projectName: rfq.projectName,
      hirer: rfq.customerName,
      securityDeposit: securityDepositAmount,
    });
  }
  console.log(`  - Created ${createdAgreements.length} RentalAgreements with AgreementItems.`);

  console.log("Creating 50 DeliveryRequests with DeliverySets and DO issued...");
  const doNumbers: string[] = [];
  const firstDeliverySetIds: string[] = [];
  const createdDeliveryRequestIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const rfq = createdRfqs[i];
    const ag = createdAgreements[i];
    const requestId = SAMPLE_DO_NUMBERS[i];
    doNumbers.push(requestId);
    const totalSets = SAMPLE_TOTAL_SETS[i];
    const deliveryRequest = await prisma.deliveryRequest.create({
      data: {
        requestId,
        customerName: rfq.customerName,
        agreementNo: ag.agreementNumber,
        customerPhone: rfq.customerPhone ?? undefined,
        customerEmail: rfq.customerEmail,
        deliveryAddress: `${rfq.projectLocation}, Malaysia`,
        deliveryType: SAMPLE_DELIVERY_TYPES[i],
        requestDate: new Date(SAMPLE_DELIVERY_REQUEST_DATES[i] + "T00:00:00.000Z"),
        totalSets,
        deliveredSets: totalSets,
        rfqId: rfq.id,
      },
    });
    const rfqItems = await prisma.rFQItem.findMany({ where: { rfqId: rfq.id }, orderBy: { setName: "asc" } });
    const itemsBySet = new Map<string, { scaffoldingItemId: string; scaffoldingItemName: string; quantity: number }[]>();
    for (const it of rfqItems) {
      const list = itemsBySet.get(it.setName) ?? [];
      list.push({
        scaffoldingItemId: it.scaffoldingItemId,
        scaffoldingItemName: it.scaffoldingItemName,
        quantity: it.quantity,
      });
      itemsBySet.set(it.setName, list);
    }
    const setNames = Array.from(itemsBySet.keys()).slice(0, totalSets);
    if (setNames.length === 0) setNames.push("Set 1");
    let firstSetId: string | null = null;
    const allDeliverySetIdsThisRequest: string[] = [];
    for (let s = 0; s < setNames.length; s++) {
      const setName = setNames[s];
      const scheduledPeriod = `${SAMPLE_DELIVERY_REQUEST_DATES[i]} to ${SAMPLE_INSPECTION_DATES[i]}`;
      const deliveryFeeAmount = 150 + i * 20 + s * 15;
      const deliverySet = await prisma.deliverySet.create({
        data: {
          setName,
          scheduledPeriod,
          status: "Completed",
          deliveryRequestId: deliveryRequest.id,
          createdBy: salesUser.id,
          deliveryFee: deliveryFeeAmount,
        },
      });
      allDeliverySetIdsThisRequest.push(deliverySet.id);
      if (firstSetId === null) firstSetId = deliverySet.id;
      const setItems = itemsBySet.get(setName) ?? [];
      for (const it of setItems) {
        await prisma.deliverySetItem.create({
          data: {
            name: it.scaffoldingItemName,
            quantity: it.quantity,
            scaffoldingItemId: it.scaffoldingItemId,
            deliverySetId: deliverySet.id,
          },
        });
      }
      if (s === 0) {
        await prisma.deliveryDOIssued.create({
          data: {
            deliverySetId: deliverySet.id,
            doNumber: requestId,
            doIssuedAt: new Date(SAMPLE_DELIVERY_REQUEST_DATES[i] + "T10:00:00.000Z"),
            doIssuedBy: salesUser.id,
          },
        });
      }
    }
    firstDeliverySetIds.push(firstSetId ?? "");
    createdDeliveryRequestIds.push(deliveryRequest.id);
    for (const dsId of allDeliverySetIdsThisRequest) {
      const driverIndex = (i + allDeliverySetIdsThisRequest.indexOf(dsId)) % 10;
      await prisma.deliveryDispatch.create({
        data: {
          deliverySetId: dsId,
          driverName: `Driver ${driverIndex + 1}`,
          driverContact: `+60 12-${String(3456789 + driverIndex).padStart(7, "0")}`,
          vehicleNumber: `VH-${String(1000 + i + (allDeliverySetIdsThisRequest.indexOf(dsId) * 2)).slice(-4)}`,
          dispatchedAt: new Date(SAMPLE_DELIVERY_REQUEST_DATES[i] + "T08:00:00.000Z"),
        },
      });
    }
  }
  console.log(`  - Created 50 DeliveryRequests with DeliverySets, DO issued, and Dispatch.`);

  console.log("Creating 50 ReturnRequests with items...");
  const createdReturnRequestIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const rfq = createdRfqs[i];
    const ag = createdAgreements[i];
    const deliverySetId = firstDeliverySetIds[i];
    const pickupAddress = `${SAMPLE_LOCATIONS[i]}, Malaysia`;
    const deliveryDate = new Date(SAMPLE_DELIVERY_REQUEST_DATES[i] + "T00:00:00.000Z");
    const returnDate = i % 4 === 0
      ? new Date(deliveryDate.getTime() + 35 * 24 * 60 * 60 * 1000)
      : new Date(SAMPLE_RETURN_REQUEST_DATES[i] + "T00:00:00.000Z");
    const pickupFeeAmount = 50 + i * 8;
    const returnRequest = await prisma.returnRequest.create({
      data: {
        requestId: SAMPLE_RETURN_REQUEST_IDS[i],
        customerName: rfq.customerName,
        agreementNo: ag.agreementNumber,
        setName: "Set 1",
        requestDate: returnDate,
        status: "Completed",
        reason: SAMPLE_RETURN_REASONS[i],
        pickupAddress,
        customerPhone: rfq.customerPhone ?? undefined,
        customerEmail: rfq.customerEmail,
        returnType: SAMPLE_RETURN_TYPES[i],
        collectionMethod: SAMPLE_COLLECTION_METHODS[i],
        deliverySetId: deliverySetId || undefined,
        pickupFee: pickupFeeAmount,
      },
    });
    const setItems = deliverySetId
      ? await prisma.deliverySetItem.findMany({ where: { deliverySetId } })
      : [];
    for (const dsi of setItems) {
      const rrItem = await prisma.returnRequestItem.create({
        data: {
          name: dsi.name,
          quantity: dsi.quantity,
          quantityReturned: dsi.quantity,
          scaffoldingItemId: dsi.scaffoldingItemId ?? undefined,
          deliverySetId: dsi.deliverySetId,
          returnRequestId: returnRequest.id,
        },
      });
      await prisma.returnItemCondition.createMany({
        data: [
          { returnRequestItemId: rrItem.id, status: "Good", quantity: dsi.quantity },
          { returnRequestItemId: rrItem.id, status: "Damaged", quantity: 0 },
          { returnRequestItemId: rrItem.id, status: "Replace", quantity: 0 },
        ],
      });
    }
    createdReturnRequestIds.push(returnRequest.id);
  }
  console.log(`  - Created 50 ReturnRequests with items.`);

  console.log("Creating 50 ConditionReports with InspectionItems...");
  const scaffItemsForInspection = await prisma.scaffoldingItem.findMany({
    take: 25,
    select: { id: true, name: true, price: true },
  });
  const createdConditionReportIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const rfq = createdRfqs[i];
    const doNum = doNumbers[i];
    const inspDate = SAMPLE_INSPECTION_DATES[i];
    const cr = await prisma.conditionReport.create({
      data: {
        rcfNumber: SAMPLE_RCF_NUMBERS[i],
        deliveryOrderNumber: doNum,
        customerName: rfq.customerName,
        returnDate: inspDate,
        inspectionDate: inspDate,
        inspectedBy: "Operations Team",
        status: "completed",
        totalItemsInspected: 0,
        totalGood: 0,
        totalRepair: 0,
        totalWriteOff: 0,
        totalDamaged: 0,
        totalRepairCost: 0,
      },
    });
    let totalItemsInspected = 0;
    let totalGood = 0;
    let totalRepair = 0;
    let totalWriteOff = 0;
    const numItems = 2 + (i % 4);
    for (let k = 0; k < numItems && k < scaffItemsForInspection.length; k++) {
      const si = scaffItemsForInspection[(i + k) % scaffItemsForInspection.length];
      const qty = 3 + (i + k) % 8;
      const qGood = Math.floor(qty * 0.6);
      const qRepair = Math.floor(qty * 0.3);
      const qWriteOff = qty - qGood - qRepair;
      totalItemsInspected += qty;
      totalGood += qGood;
      totalRepair += qRepair;
      totalWriteOff += qWriteOff;
      await prisma.inspectionItem.create({
        data: {
          conditionReportId: cr.id,
          scaffoldingItemId: si.id,
          scaffoldingItemName: si.name,
          quantity: qty,
          quantityGood: qGood,
          quantityRepair: qRepair,
          quantityWriteOff: qWriteOff,
          condition: qWriteOff > 0 ? "major-damage" : qRepair > 0 ? "minor-damage" : "good",
          originalItemPrice: si.price ?? 0,
        },
      });
    }
    await prisma.conditionReport.update({
      where: { id: cr.id },
      data: {
        totalItemsInspected,
        totalGood,
        totalRepair,
        totalWriteOff,
        totalDamaged: totalRepair + totalWriteOff,
        totalRepairCost: totalRepair * 15,
      },
    });
    createdConditionReportIds.push(cr.id);
  }
  console.log(`  - Created 50 ConditionReports with InspectionItems.`);

  console.log("Creating OpenRepairSlips and RepairItems for maintenance report...");
  const operationsUser = await prisma.user.findFirst({
    where: { email: "operations@powermetalsteel.com" },
    select: { id: true },
  });
  const scaffItemsForRepair = await prisma.scaffoldingItem.findMany({
    take: 20,
    select: { id: true, name: true },
  });
  const DAMAGE_TYPES = ["bent", "cracked", "corroded", "missing-parts", "welding-required", "other"];
  for (let i = 0; i < 15 && i < createdConditionReportIds.length; i++) {
    const conditionReportId = createdConditionReportIds[i];
    const rcfNumber = SAMPLE_RCF_NUMBERS[i];
    const inspDate = SAMPLE_INSPECTION_DATES[i];
    const orpNumber = `ORP-2025-${String(i + 1).padStart(5, "0")}`;
    const openRepairSlip = await prisma.openRepairSlip.create({
      data: {
        orpNumber,
        conditionReportId,
        rcfNumber,
        status: "completed",
        startDate: inspDate,
        completionDate: inspDate,
        assignedTo: operationsUser?.id ?? undefined,
        createdBy: operationsUser?.id ?? salesUser.id,
      },
    });
    const si = scaffItemsForRepair[i % scaffItemsForRepair.length];
    const itemCost = 50 + i * 10;
    if (si) {
      await prisma.repairItem.create({
        data: {
          openRepairSlipId: openRepairSlip.id,
          scaffoldingItemId: si.id,
          scaffoldingItemName: si.name,
          quantity: 1,
          quantityRepair: 1,
          quantityRepaired: 1,
          damageType: DAMAGE_TYPES[i % DAMAGE_TYPES.length],
          repairStatus: "completed",
          totalCost: itemCost,
          finalCost: itemCost,
          completedDate: inspDate,
        },
      });
      await prisma.openRepairSlip.update({
        where: { id: openRepairSlip.id },
        data: { estimatedCost: itemCost, actualCost: itemCost },
      });
    }
  }
  console.log(`  - Created 15 OpenRepairSlips with RepairItems (estimatedCost/actualCost set).`);

  console.log("Creating 50 Deposits linked to RentalAgreements...");
  const createdDepositIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const ag = createdAgreements[i];
    const dueDate = new Date(SAMPLE_DEPOSIT_DUE_DATES[i] + "T00:00:00.000Z");
    const approvedAt = new Date(SAMPLE_DEPOSIT_APPROVED_DATES[i] + "T00:00:00.000Z");
    const dep = await prisma.deposit.create({
      data: {
        depositNumber: SAMPLE_DEPOSIT_NUMBERS[i],
        agreementId: ag.id,
        depositAmount: ag.securityDeposit,
        status: "Paid",
        dueDate,
        approvedAt,
        referenceNumber: `SEED-${i + 1}`,
      },
    });
    createdDepositIds.push(dep.id);
  }
  console.log(`  - Created 50 Deposits.`);

  console.log("Creating 50 MonthlyRentalInvoices with items...");
  const createdMonthlyInvoiceIds: string[] = [];
  const createdMonthlyInvoiceNumbers: string[] = [];
  for (let i = 0; i < 50; i++) {
    const ag = createdAgreements[i];
    const rfq = createdRfqs[i];
    const deliveryRequestId = createdDeliveryRequestIds[i];
    const billingMonth = SAMPLE_BILLING_MONTHS[i];
    const billingYear = SAMPLE_BILLING_YEARS[i];
    const startDate = new Date(billingYear, billingMonth - 1, 1);
    const endDate = new Date(billingYear, billingMonth, 0);
    const daysInPeriod = endDate.getDate();
    const agreementWithItems = await prisma.rentalAgreement.findUnique({
      where: { id: ag.id },
      include: { items: true },
    });
    const monthlyRental = Number(agreementWithItems?.monthlyRental ?? 0);
    const baseAmount = Math.round((monthlyRental / 30) * daysInPeriod * 100) / 100;
    const totalAmount = baseAmount;
    const dueDate = new Date(SAMPLE_MRI_DUE_DATES[i] + "T00:00:00.000Z");
    const status = i % 3 === 0 ? "Pending Payment" : "Paid";
    const inv = await prisma.monthlyRentalInvoice.create({
      data: {
        invoiceNumber: SAMPLE_MRI_NUMBERS[i],
        deliveryRequestId,
        agreementId: ag.id,
        customerName: rfq.customerName,
        customerEmail: rfq.customerEmail ?? undefined,
        customerPhone: rfq.customerPhone ?? undefined,
        billingMonth,
        billingYear,
        billingStartDate: startDate,
        billingEndDate: endDate,
        daysInPeriod,
        baseAmount,
        overdueCharges: 0,
        totalAmount,
        status,
        dueDate,
        ...(status === "Paid" && {
          approvedAt: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
          referenceNumber: `MRI-PAY-${i + 1}`,
        }),
      },
    });
    createdMonthlyInvoiceIds.push(inv.id);
    createdMonthlyInvoiceNumbers.push(inv.invoiceNumber);
    const agreementItems = agreementWithItems?.items ?? [];
    const rfqItemsForQty = await prisma.rFQItem.findMany({ where: { rfqId: rfq.id } });
    const qtyByScaffId = new Map<string, number>();
    for (const ri of rfqItemsForQty) {
      qtyByScaffId.set(ri.scaffoldingItemId, (qtyByScaffId.get(ri.scaffoldingItemId) ?? 0) + ri.quantity);
    }
    for (const ai of agreementItems) {
      const qty = qtyByScaffId.get(ai.scaffoldingItemId) ?? 10;
      const unitPrice = Number(ai.agreedMonthlyRate) / 30;
      const lineTotal = Math.round(qty * unitPrice * daysInPeriod * 100) / 100;
      await prisma.monthlyRentalInvoiceItem.create({
        data: {
          invoiceId: inv.id,
          scaffoldingItemId: ai.scaffoldingItemId,
          scaffoldingItemName: ai.scaffoldingItemName,
          quantityBilled: qty,
          unitPrice,
          lineTotal,
        },
      });
    }
  }
  console.log(`  - Created 50 MonthlyRentalInvoices with items.`);

  console.log("Creating 50 AdditionalCharges with items...");
  for (let i = 0; i < 50; i++) {
    const rfq = createdRfqs[i];
    const returnRequestId = createdReturnRequestIds[i];
    const doId = doNumbers[i];
    const returnedDate = SAMPLE_RETURN_REQUEST_DATES[i];
    const dueDate = new Date(SAMPLE_AC_DUE_DATES[i] + "T00:00:00.000Z");
    const totalCharges = (i % 5 === 0 ? 150 : i % 5 === 1 ? 200 : 100);
    const status = i % 2 === 0 ? "approved" : "pending_payment";
    const ac = await prisma.additionalCharge.create({
      data: {
        invoiceNo: SAMPLE_AC_INVOICE_NOS[i],
        returnRequestId,
        customerName: rfq.customerName,
        doId,
        returnedDate,
        dueDate,
        totalCharges,
        status,
        ...(status === "approved" && {
          approvalDate: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000),
        }),
      },
    });
    await prisma.additionalChargeItem.create({
      data: {
        additionalChargeId: ac.id,
        itemName: "Delivery/Return handling fee",
        itemType: "Damage",
        quantity: 1,
        unitPrice: totalCharges,
        amount: totalCharges,
      },
    });
  }
  console.log(`  - Created 50 AdditionalCharges with items.`);

  console.log("Creating 50 CreditNotes with items...");
  const createdCreditNoteIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const rfq = createdRfqs[i];
    const ag = createdAgreements[i];
    const custId = malaysiaCustomers[SAMPLE_CUSTOMER_INDEX[i] % malaysiaCustomers.length].id;
    const isMonthly = i % 2 === 0;
    const sourceId = isMonthly ? createdMonthlyInvoiceIds[i] : createdDepositIds[i];
    const invoiceType = isMonthly ? "monthlyRental" : "deposit";
    const originalInvoice = isMonthly ? createdMonthlyInvoiceNumbers[i] : SAMPLE_DEPOSIT_NUMBERS[i];
    const amount = isMonthly ? Math.round((createdAgreements[i].securityDeposit * 0.1) * 100) / 100 : Math.round(createdAgreements[i].securityDeposit * 0.05 * 100) / 100;
    const cn = await prisma.creditNote.create({
      data: {
        creditNoteNumber: SAMPLE_CN_NUMBERS[i],
        customerName: rfq.customerName,
        customerId: custId,
        invoiceType,
        sourceId,
        originalInvoice,
        agreementId: ag.id,
        amount,
        reason: SAMPLE_CN_REASONS[i],
        date: new Date(SAMPLE_CN_DATES[i] + "T00:00:00.000Z"),
        status: "Approved",
        createdBy: salesUser.id,
        approvedAt: new Date(SAMPLE_CN_DATES[i] + "T12:00:00.000Z"),
      },
    });
    createdCreditNoteIds.push(cn.id);
    await prisma.creditNoteItem.create({
      data: {
        creditNoteId: cn.id,
        description: "Credit adjustment - " + SAMPLE_CN_REASONS[i],
        quantity: 1,
        previousPrice: amount,
        currentPrice: amount,
        unitPrice: amount,
        amount,
      },
    });
  }
  console.log(`  - Created 50 CreditNotes with items.`);

  console.log("Creating 50 Refunds...");
  for (let i = 0; i < 50; i++) {
    const rfq = createdRfqs[i];
    const custId = malaysiaCustomers[SAMPLE_CUSTOMER_INDEX[i] % malaysiaCustomers.length].id;
    const creditNoteId = createdCreditNoteIds[i];
    const cn = await prisma.creditNote.findUnique({ where: { id: creditNoteId } });
    const invoiceType = cn?.invoiceType ?? "monthlyRental";
    const sourceId = cn?.sourceId ?? (invoiceType === "deposit" ? createdDepositIds[i] : createdMonthlyInvoiceIds[i]);
    const originalInvoice = cn?.originalInvoice ?? (invoiceType === "deposit" ? SAMPLE_DEPOSIT_NUMBERS[i] : createdMonthlyInvoiceNumbers[i]);
    const amount = Number(cn?.amount ?? 50);
    await prisma.refund.create({
      data: {
        refundNumber: SAMPLE_REFUND_NUMBERS[i],
        invoiceType,
        sourceId,
        originalInvoice,
        customerName: rfq.customerName,
        customerId: custId,
        creditNoteId,
        creditNoteNumber: SAMPLE_CN_NUMBERS[i],
        amount,
        refundMethod: i % 3 === 0 ? "Bank Transfer" : i % 3 === 1 ? "eWallet" : "Cash",
        reason: "Credit note refund",
        status: "Approved",
        createdBy: salesUser.id,
        approvedAt: new Date(SAMPLE_CN_DATES[i] + "T14:00:00.000Z"),
      },
    });
  }
  console.log(`  - Created 50 Refunds.`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
