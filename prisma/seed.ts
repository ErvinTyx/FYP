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

  // Create sample rental agreements
  console.log("Creating sample rental agreements...");

  // Delete all existing agreements for a fresh seed
  await prisma.rentalAgreement.deleteMany({});

  // Agreement 1 - Active (High-Rise Construction)
  const agreement1 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-001",
      poNumber: "PO-2026-001",
      projectName: "Menara KL Sentral Phase 2",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "ABC Construction Sdn Bhd",
      hirerPhone: "+60 12-345 6789",
      location: "Jalan Stesen Sentral 5, KL Sentral, 50470 Kuala Lumpur",
      termOfHire: "9 months (01 Jan 2026 - 30 Sep 2026)",
      transportation: "Included - Delivery & Collection",
      monthlyRental: 25000,
      securityDeposit: 2,
      minimumCharges: 3,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Tan Wei Ming",
      hirerNRIC: "850505-10-1234",
      status: "Active",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      versions: {
        create: {
          versionNumber: 1,
          changes: "Initial agreement created",
          allowedRoles: JSON.stringify(["Admin", "Manager", "Sales", "Finance"]),
          createdBy: "superadmin@powermetalsteel.com",
        },
      },
    },
  });
  console.log(`  - Agreement: ${agreement1.agreementNumber} (${agreement1.projectName})`);

  // Agreement 2 - Active (Commercial Building)
  const agreement2 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-002",
      poNumber: "PO-2026-002",
      projectName: "Pavilion Damansara Heights Extension",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "XYZ Development Sdn Bhd",
      hirerPhone: "+60 11-222 3333",
      location: "Jalan Damansara, Damansara Heights, 50490 Kuala Lumpur",
      termOfHire: "12 months (01 Feb 2026 - 31 Jan 2027)",
      transportation: "Included - Delivery Only",
      monthlyRental: 38000,
      securityDeposit: 3,
      minimumCharges: 6,
      defaultInterest: 2.0,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Sarah Lee Mei Ling",
      hirerNRIC: "900812-14-5678",
      status: "Active",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      versions: {
        create: {
          versionNumber: 1,
          changes: "Initial agreement created",
          allowedRoles: JSON.stringify(["Admin", "Manager", "Sales", "Finance"]),
          createdBy: "superadmin@powermetalsteel.com",
        },
      },
    },
  });
  console.log(`  - Agreement: ${agreement2.agreementNumber} (${agreement2.projectName})`);

  // Agreement 3 - Active (Infrastructure Project)
  const agreement3 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-003",
      poNumber: "PO-2026-003",
      projectName: "MRT3 Circle Line - Station C7",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "DEF Builders Sdn Bhd",
      hirerPhone: "+60 13-456 7890",
      location: "Jalan Ipoh, Batu, 51200 Kuala Lumpur",
      termOfHire: "18 months (01 Dec 2025 - 31 May 2027)",
      transportation: "Included - Delivery & Collection",
      monthlyRental: 45000,
      securityDeposit: 3,
      minimumCharges: 4,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Mohd Razak bin Hassan",
      hirerNRIC: "780315-08-4321",
      status: "Active",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      versions: {
        create: {
          versionNumber: 1,
          changes: "Initial agreement created",
          allowedRoles: JSON.stringify(["Admin", "Manager", "Sales", "Finance"]),
          createdBy: "superadmin@powermetalsteel.com",
        },
      },
    },
  });
  console.log(`  - Agreement: ${agreement3.agreementNumber} (${agreement3.projectName})`);

  // Agreement 4 - Active (Residential Project)
  const agreement4 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-004",
      poNumber: "PO-2026-004",
      projectName: "Setia Sky Residences Tower B",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Megah Engineering Sdn Bhd",
      hirerPhone: "+60 16-765 4321",
      location: "Jalan Sultan Ismail, 50250 Kuala Lumpur",
      termOfHire: "6 months (15 Jan 2026 - 14 Jul 2026)",
      transportation: "Excluded - Self Collection",
      monthlyRental: 18000,
      securityDeposit: 2,
      minimumCharges: 2,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Lim Chee Keong",
      hirerNRIC: "820420-10-8765",
      status: "Active",
      currentVersion: 2,
      createdBy: "superadmin@powermetalsteel.com",
      versions: {
        create: [
          {
            versionNumber: 1,
            changes: "Initial draft created",
            allowedRoles: JSON.stringify(["Admin", "Manager", "Sales"]),
            createdBy: "superadmin@powermetalsteel.com",
          },
          {
            versionNumber: 2,
            changes: "Updated term from 4 months to 6 months",
            allowedRoles: JSON.stringify(["Admin", "Manager", "Sales", "Finance"]),
            createdBy: "superadmin@powermetalsteel.com",
          },
        ],
      },
    },
  });
  console.log(`  - Agreement: ${agreement4.agreementNumber} (${agreement4.projectName})`);

  // Create sample RFQs (Quotations)
  console.log("Creating sample RFQs (Quotations)...");

  // Delete all existing RFQs for a fresh seed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).rFQItem.deleteMany({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).rFQ.deleteMany({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq1 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20260115-00001',
      customerName: 'ABC Construction Sdn Bhd',
      customerEmail: 'project@abcconstruction.com.my',
      customerPhone: '+60 12-345 6789',
      projectName: 'Menara KL Sentral Phase 2',
      projectLocation: 'Jalan Stesen Sentral 5, KL Sentral, 50470 Kuala Lumpur',
      requestedDate: new Date('2026-01-15'),
      requiredDate: new Date('2026-01-25'),
      status: 'approved',
      totalAmount: 25000,
      notes: 'High-rise scaffolding for KL Sentral project',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-001', scaffoldingItemName: 'CRAB BASIC STANDARD C60', quantity: 100, unit: 'pcs', unitPrice: 0.59, totalPrice: 59 },
          { scaffoldingItemId: 'SC-006', scaffoldingItemName: 'CRAB STANDARD 2.00M C60', quantity: 200, unit: 'pcs', unitPrice: 2.59, totalPrice: 518 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantity: 50, unit: 'pcs', unitPrice: 1.30, totalPrice: 65 },
        ],
      },
    },
  });
  console.log(`  - RFQ: ${rfq1.rfqNumber} (${rfq1.customerName})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq2 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20260120-00002',
      customerName: 'XYZ Development Sdn Bhd',
      customerEmail: 'ops@xyzdevelopment.com.my',
      customerPhone: '+60 11-222 3333',
      projectName: 'Pavilion Damansara Heights Extension',
      projectLocation: 'Jalan Damansara, Damansara Heights, 50490 Kuala Lumpur',
      requestedDate: new Date('2026-01-20'),
      requiredDate: new Date('2026-02-01'),
      status: 'approved',
      totalAmount: 38000,
      notes: 'Commercial building scaffolding',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-011', scaffoldingItemName: 'CRAB STANDARD 0.75M C60', quantity: 200, unit: 'pcs', unitPrice: 1.21, totalPrice: 242 },
          { scaffoldingItemId: 'SC-007', scaffoldingItemName: 'CRAB LEDGER 0.70M', quantity: 150, unit: 'pcs', unitPrice: 0.56, totalPrice: 84 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantity: 80, unit: 'pcs', unitPrice: 1.30, totalPrice: 104 },
          { scaffoldingItemId: 'SC-009', scaffoldingItemName: 'CRAB BRACE H2 X L0.70M', quantity: 40, unit: 'pcs', unitPrice: 1.31, totalPrice: 52.4 },
        ],
      },
    },
  });
  console.log(`  - RFQ: ${rfq2.rfqNumber} (${rfq2.customerName})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq3 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20260110-00003',
      customerName: 'DEF Builders Sdn Bhd',
      customerEmail: 'project@defbuilders.com.my',
      customerPhone: '+60 13-456 7890',
      projectName: 'MRT3 Circle Line - Station C7',
      projectLocation: 'Jalan Ipoh, Batu, 51200 Kuala Lumpur',
      requestedDate: new Date('2026-01-10'),
      requiredDate: new Date('2026-01-20'),
      status: 'approved',
      totalAmount: 45000,
      notes: 'Infrastructure project - MRT station scaffolding',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-003', scaffoldingItemName: 'CRAB STANDARD 1.00M C60', quantity: 150, unit: 'pcs', unitPrice: 1.46, totalPrice: 219 },
          { scaffoldingItemId: 'SC-004', scaffoldingItemName: 'CRAB LEDGER 1.50M', quantity: 180, unit: 'pcs', unitPrice: 1.12, totalPrice: 201.6 },
          { scaffoldingItemId: 'SC-005', scaffoldingItemName: 'CRAB BRACE H2 X L1.50M', quantity: 30, unit: 'pcs', unitPrice: 1.50, totalPrice: 45 },
          { scaffoldingItemId: 'SC-012', scaffoldingItemName: 'CRAB TRIANGLE 1.5M', quantity: 80, unit: 'pcs', unitPrice: 2.78, totalPrice: 222.4 },
        ],
      },
    },
  });
  console.log(`  - RFQ: ${rfq3.rfqNumber} (${rfq3.customerName})`);

  // Create sample delivery requests linked to RFQs
  console.log("Creating sample delivery requests...");

  // Delete all existing delivery requests for a fresh seed
  await prisma.deliveryRequest.deleteMany({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delivery1 = await (prisma.deliveryRequest.create as any)({
    data: {
      requestId: 'DEL-2026-0001',
      customerName: 'ABC Construction Sdn Bhd',
      agreementNo: 'RFQ-20260115-00001',
      customerPhone: '+60 12-345 6789',
      customerEmail: 'project@abcconstruction.com.my',
      deliveryAddress: 'Jalan Stesen Sentral 5, KL Sentral, 50470 Kuala Lumpur',
      deliveryType: 'delivery',
      totalSets: 3,
      deliveredSets: 0,
      rfqId: rfq1.id,
      sets: {
        create: [
          {
            setName: 'Set A - Foundation Phase',
            scheduledPeriod: '01 Jan 2026 - 31 Mar 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'CRAB BASIC STANDARD C60', quantity: 100, scaffoldingItemId: 'SC-001' },
                { name: 'CRAB STANDARD 2.00M C60', quantity: 200, scaffoldingItemId: 'SC-006' },
                { name: 'CRAB JACK BASE C60 / 600', quantity: 50, scaffoldingItemId: 'SC-014' },
              ],
            },
          },
          {
            setName: 'Set B - Structure Phase',
            scheduledPeriod: '01 Apr 2026 - 30 Jun 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'CRAB STANDARD 1.00M C60', quantity: 150, scaffoldingItemId: 'SC-003' },
                { name: 'CRAB LEDGER 1.50M', quantity: 180, scaffoldingItemId: 'SC-004' },
                { name: 'CRAB BRACE H2 X L1.50M', quantity: 60, scaffoldingItemId: 'SC-005' },
                { name: 'CRAB TRIANGLE 1.5M', quantity: 80, scaffoldingItemId: 'SC-012' },
              ],
            },
          },
          {
            setName: 'Set C - Finishing Phase',
            scheduledPeriod: '01 Jul 2026 - 30 Sep 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'CRAB STANDARD 0.75M C60', quantity: 120, scaffoldingItemId: 'SC-011' },
                { name: 'CRAB LEDGER 0.70M', quantity: 100, scaffoldingItemId: 'SC-007' },
                { name: 'CRAB U-HEAD C60 / 600', quantity: 40, scaffoldingItemId: 'SC-015' },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  - Delivery Request: ${delivery1.requestId} (linked to ${rfq1.rfqNumber}) - 3 sets`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delivery2 = await (prisma.deliveryRequest.create as any)({
    data: {
      requestId: 'DEL-2026-0002',
      customerName: 'XYZ Development Sdn Bhd',
      agreementNo: 'RFQ-20260120-00002',
      customerPhone: '+60 11-222 3333',
      customerEmail: 'ops@xyzdevelopment.com.my',
      deliveryAddress: 'Jalan Damansara, Damansara Heights, 50490 Kuala Lumpur',
      deliveryType: 'delivery',
      totalSets: 1,
      deliveredSets: 0,
      rfqId: rfq2.id,
      sets: {
        create: [
          {
            setName: 'Set A - Podium Level',
            scheduledPeriod: '01 Feb 2026 - 31 Jul 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'CRAB STANDARD 0.75M C60', quantity: 200, scaffoldingItemId: 'SC-011' },
                { name: 'CRAB LEDGER 0.70M', quantity: 150, scaffoldingItemId: 'SC-007' },
                { name: 'CRAB JACK BASE C60 / 600', quantity: 80, scaffoldingItemId: 'SC-014' },
                { name: 'CRAB BRACE H2 X L0.70M', quantity: 40, scaffoldingItemId: 'SC-009' },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  - Delivery Request: ${delivery2.requestId} (linked to ${rfq2.rfqNumber})`);

  // Create sample return requests
  console.log("Creating sample return requests...");

  // Delete all existing return requests for a fresh seed
  await prisma.returnRequest.deleteMany({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const return1 = await (prisma.returnRequest.create as any)({
    data: {
      requestId: 'RET-2026-0001',
      customerName: 'ABC Construction Sdn Bhd',
      agreementNo: 'RFQ-20260115-00001',
      setName: 'Set A - Foundation Phase',
      reason: 'Foundation phase completed - All scaffolding to be returned',
      pickupAddress: 'Jalan Stesen Sentral 5, KL Sentral, 50470 Kuala Lumpur',
      customerPhone: '+60 12-345 6789',
      customerEmail: 'project@abcconstruction.com.my',
      returnType: 'full',
      collectionMethod: 'transport',
      status: 'Requested',
      rfqId: rfq1.id,
      items: {
        create: [
          { name: 'CRAB BASIC STANDARD C60', quantity: 100, scaffoldingItemId: 'SC-001' },
          { name: 'CRAB STANDARD 2.00M C60', quantity: 200, scaffoldingItemId: 'SC-006' },
          { name: 'CRAB JACK BASE C60 / 600', quantity: 50, scaffoldingItemId: 'SC-014' },
        ],
      },
    },
  });
  console.log(`  - Return Request: ${return1.requestId} (linked to ${rfq1.rfqNumber})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const return2 = await (prisma.returnRequest.create as any)({
    data: {
      requestId: 'RET-2026-0002',
      customerName: 'XYZ Development Sdn Bhd',
      agreementNo: 'RFQ-20260120-00002',
      setName: 'Set A - Podium Level (Partial)',
      reason: 'Partial return - Excess scaffolding not needed',
      pickupAddress: 'Jalan Damansara, Damansara Heights, 50490 Kuala Lumpur',
      customerPhone: '+60 11-222 3333',
      customerEmail: 'ops@xyzdevelopment.com.my',
      returnType: 'partial',
      collectionMethod: 'self-return',
      status: 'Requested',
      rfqId: rfq2.id,
      items: {
        create: [
          { name: 'CRAB STANDARD 0.75M C60', quantity: 50, scaffoldingItemId: 'SC-011' },
          { name: 'CRAB LEDGER 0.70M', quantity: 30, scaffoldingItemId: 'SC-007' },
        ],
      },
    },
  });
  console.log(`  - Return Request: ${return2.requestId} (linked to ${rfq2.rfqNumber})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const return3 = await (prisma.returnRequest.create as any)({
    data: {
      requestId: 'RET-2026-0003',
      customerName: 'DEF Builders Sdn Bhd',
      agreementNo: 'RFQ-20260110-00003',
      setName: 'Set A - MRT Station Phase 1',
      reason: 'MRT station phase 1 completed ahead of schedule',
      pickupAddress: 'Jalan Ipoh, Batu, 51200 Kuala Lumpur',
      customerPhone: '+60 13-456 7890',
      customerEmail: 'project@defbuilders.com.my',
      returnType: 'full',
      collectionMethod: 'transport',
      status: 'Requested',
      rfqId: rfq3.id,
      items: {
        create: [
          { name: 'CRAB STANDARD 1.00M C60', quantity: 150, scaffoldingItemId: 'SC-003' },
          { name: 'CRAB LEDGER 1.50M', quantity: 180, scaffoldingItemId: 'SC-004' },
          { name: 'CRAB BRACE H2 X L1.50M', quantity: 30, scaffoldingItemId: 'SC-005' },
          { name: 'CRAB TRIANGLE 1.5M', quantity: 80, scaffoldingItemId: 'SC-012' },
        ],
      },
    },
  });
  console.log(`  - Return Request: ${return3.requestId} (linked to ${rfq3.rfqNumber})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const return4 = await (prisma.returnRequest.create as any)({
    data: {
      requestId: 'RET-2026-0004',
      customerName: 'Premium Projects Sdn Bhd',
      agreementNo: 'RFQ-20251220-00004',
      setName: 'Set A - Main Structure',
      reason: 'Project completed - Full return with inspection',
      pickupAddress: 'No. 55, Jalan Bukit Bintang, 55100 Kuala Lumpur',
      customerPhone: '+60 16-345 6789',
      customerEmail: 'premium@projects.com',
      returnType: 'full',
      collectionMethod: 'transport',
      status: 'Requested',
      items: {
        create: [
          { name: 'CRAB STANDARD 1.00M C60', quantity: 60, scaffoldingItemId: 'SC-003' },
          { name: 'CRAB BRACE H2 X L1.50M', quantity: 120, scaffoldingItemId: 'SC-005' },
          { name: 'CRAB TRIANGLE 1.5M', quantity: 40, scaffoldingItemId: 'SC-012' },
        ],
      },
    },
  });
  console.log(`  - Return Request: ${return4.requestId}`);

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
      quantity: 406,
      available: 380,
      price: 0.59,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-002',
      name: 'CRAB STANDARD 0.30M C60',
      category: 'CLUSTER (4.7M)',
      quantity: 170,
      available: 150,
      price: 0.75,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-003',
      name: 'CRAB STANDARD 1.00M C60',
      category: 'CLUSTER (4.7M)',
      quantity: 388,
      available: 350,
      price: 1.46,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-004',
      name: 'CRAB LEDGER 1.50M',
      category: 'CLUSTER (4.7M)',
      quantity: 918,
      available: 850,
      price: 1.12,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-005',
      name: 'CRAB BRACE H2 X L1.50M',
      category: 'CLUSTER (4.7M)',
      quantity: 238,
      available: 200,
      price: 1.50,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    // CLUSTER (3.5M) items
    {
      itemCode: 'SC-006',
      name: 'CRAB STANDARD 2.00M C60',
      category: 'CLUSTER (3.5M)',
      quantity: 362,
      available: 320,
      price: 2.59,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-007',
      name: 'CRAB LEDGER 0.70M',
      category: 'CLUSTER (3.5M)',
      quantity: 360,
      available: 330,
      price: 0.56,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-008',
      name: 'CRAB LEDGER 1.00M',
      category: 'CLUSTER (3.5M)',
      quantity: 118,
      available: 100,
      price: 0.77,
      status: 'Available',
      location: 'Warehouse B',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-009',
      name: 'CRAB BRACE H2 X L0.70M',
      category: 'CLUSTER (3.5M)',
      quantity: 138,
      available: 120,
      price: 1.31,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-010',
      name: 'CRAB BRACE H2 X L1.00M',
      category: 'CLUSTER (3.5M)',
      quantity: 34,
      available: 30,
      price: 1.37,
      status: 'Low Stock',
      location: 'Warehouse B',
      itemStatus: 'Available',
    },
    // BUNGALOW (5.5M) items
    {
      itemCode: 'SC-011',
      name: 'CRAB STANDARD 0.75M C60',
      category: 'BUNGALOW (5.5M)',
      quantity: 206,
      available: 180,
      price: 1.21,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-012',
      name: 'CRAB TRIANGLE 1.5M',
      category: 'BUNGALOW (5.5M)',
      quantity: 545,
      available: 500,
      price: 2.78,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-013',
      name: 'CRAB TRIANGLE 0.7M',
      category: 'BUNGALOW (5.5M)',
      quantity: 574,
      available: 520,
      price: 2.21,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-014',
      name: 'CRAB JACK BASE C60 / 600',
      category: 'BUNGALOW (5.5M)',
      quantity: 347,
      available: 320,
      price: 1.30,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-015',
      name: 'CRAB U-HEAD C60 / 600',
      category: 'BUNGALOW (5.5M)',
      quantity: 347,
      available: 310,
      price: 2.07,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    // BUNGALOW (3.95M) items
    {
      itemCode: 'SC-016',
      name: 'CRAB STANDARD 0.50M C60',
      category: 'BUNGALOW (3.95M)',
      quantity: 206,
      available: 180,
      price: 0.95,
      status: 'Available',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-017',
      name: 'CRAB BRACE H1 X L0.70M',
      category: 'BUNGALOW (3.95M)',
      quantity: 28,
      available: 20,
      price: 0.82,
      status: 'Low Stock',
      location: 'Warehouse A',
      itemStatus: 'Available',
    },
    {
      itemCode: 'SC-018',
      name: 'CRAB BRACE H1 X L1.00M',
      category: 'BUNGALOW (3.95M)',
      quantity: 34,
      available: 0,
      price: 0.93,
      status: 'Out of Stock',
      location: 'Warehouse B',
      itemStatus: 'Unavailable',
    },
    {
      itemCode: 'SC-019',
      name: 'CRAB BRACE H1 X L1.50M',
      category: 'BUNGALOW (3.95M)',
      quantity: 17,
      available: 15,
      price: 1.14,
      status: 'Low Stock',
      location: 'Warehouse A',
      itemStatus: 'Available',
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
