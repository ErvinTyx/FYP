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
  "vendor",
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
