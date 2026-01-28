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

  // Delete existing agreements to avoid duplicates (for fresh seed)
  const existingAgreements = [
    "RA-2026-001", "RA-2026-002", "RA-2026-003", "RA-2026-004",
    "RA-2026-005", "RA-2026-006", "RA-2026-007", "RA-2026-008",
    "RA-2024-001", "RA-2024-002", "RA-2023-015"
  ];
  
  for (const agr of existingAgreements) {
    await prisma.rentalAgreement.deleteMany({
      where: { agreementNumber: agr },
    });
  }

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

  // Agreement 5 - Draft (Pending Approval)
  const agreement5 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-005",
      poNumber: "PO-2026-005",
      projectName: "KLCC Park Renovation",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Green Build Solutions Sdn Bhd",
      hirerPhone: "+60 17-888 9999",
      location: "KLCC Park, Jalan Ampang, 50088 Kuala Lumpur",
      termOfHire: "4 months (01 Mar 2026 - 30 Jun 2026)",
      transportation: "Included - Delivery & Collection",
      monthlyRental: 12000,
      securityDeposit: 2,
      minimumCharges: 2,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Wong Siew Ching",
      hirerNRIC: "880615-14-2468",
      status: "Draft",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      versions: {
        create: {
          versionNumber: 1,
          changes: "Initial draft created - Pending customer approval",
          allowedRoles: JSON.stringify(["Admin", "Manager", "Sales"]),
          createdBy: "superadmin@powermetalsteel.com",
        },
      },
    },
  });
  console.log(`  - Agreement: ${agreement5.agreementNumber} (${agreement5.projectName})`);

  // Agreement 6 - Draft (New Project)
  const agreement6 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-006",
      poNumber: "PO-2026-006",
      projectName: "Bangsar South Corporate Tower",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Prestige Contractors Sdn Bhd",
      hirerPhone: "+60 19-555 6666",
      location: "Jalan Kerinchi, Bangsar South, 59200 Kuala Lumpur",
      termOfHire: "8 months (01 Apr 2026 - 30 Nov 2026)",
      transportation: "Included - Delivery Only",
      monthlyRental: 32000,
      securityDeposit: 3,
      minimumCharges: 3,
      defaultInterest: 2.0,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Kumar a/l Ramasamy",
      hirerNRIC: "750922-10-5432",
      status: "Draft",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      versions: {
        create: {
          versionNumber: 1,
          changes: "Initial draft created",
          allowedRoles: JSON.stringify(["Admin", "Manager", "Sales"]),
          createdBy: "superadmin@powermetalsteel.com",
        },
      },
    },
  });
  console.log(`  - Agreement: ${agreement6.agreementNumber} (${agreement6.projectName})`);

  // Agreement 7 - Active (Bridge Project)
  const agreement7 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-007",
      poNumber: "PO-2026-007",
      projectName: "Penang Second Bridge Maintenance",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Sunrise Development Sdn Bhd",
      hirerPhone: "+60 17-222 3333",
      location: "Penang Second Bridge, Batu Maung, 11960 Penang",
      termOfHire: "3 months (15 Jan 2026 - 14 Apr 2026)",
      transportation: "Included - Delivery & Collection",
      monthlyRental: 22000,
      securityDeposit: 2,
      minimumCharges: 2,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Ong Beng Huat",
      hirerNRIC: "830710-07-1357",
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
  console.log(`  - Agreement: ${agreement7.agreementNumber} (${agreement7.projectName})`);

  // Agreement 8 - Expired (Completed Project)
  const agreement8 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-008",
      poNumber: "PO-2025-098",
      projectName: "The Exchange TRX Finishing Works",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Elite Scaffolding Services Sdn Bhd",
      hirerPhone: "+60 14-333 4444",
      location: "Jalan Tun Razak, TRX, 55188 Kuala Lumpur",
      termOfHire: "5 months (01 Aug 2025 - 31 Dec 2025)",
      transportation: "Included - Delivery & Collection",
      monthlyRental: 28500,
      securityDeposit: 2,
      minimumCharges: 3,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Yusof bin Ismail",
      hirerNRIC: "790225-03-6789",
      status: "Expired",
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
  console.log(`  - Agreement: ${agreement8.agreementNumber} (${agreement8.projectName})`);

  // Create sample delivery requests
  console.log("Creating sample delivery requests...");

  // Delete existing delivery requests to avoid duplicates
  await prisma.deliveryRequest.deleteMany({
    where: {
      requestId: {
        in: ['DR-2026-001', 'DR-2026-002', 'DR-2026-003', 'DR-2026-004'],
      },
    },
  });

  const delivery1 = await prisma.deliveryRequest.create({
    data: {
      requestId: 'DR-2026-001',
      customerName: 'ABC Construction Sdn Bhd',
      agreementNo: 'RA-2026-001',
      customerPhone: '+60 12-345 6789',
      customerEmail: 'project@abcconstruction.com.my',
      deliveryAddress: 'Jalan Stesen Sentral 5, KL Sentral, 50470 Kuala Lumpur',
      deliveryType: 'delivery',
      totalSets: 3,
      deliveredSets: 0,
      sets: {
        create: [
          {
            setName: 'Set A - Foundation Phase',
            scheduledPeriod: '01 Jan 2026 - 31 Mar 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'Scaffolding Pipe 6m', quantity: 100 },
                { name: 'Coupler Standard', quantity: 200 },
                { name: 'Base Plate', quantity: 50 },
              ],
            },
          },
          {
            setName: 'Set B - Structure Phase',
            scheduledPeriod: '01 Apr 2026 - 30 Jun 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'Scaffolding Pipe 4m', quantity: 150 },
                { name: 'Coupler Swivel', quantity: 180 },
                { name: 'Ladder Beam', quantity: 30 },
              ],
            },
          },
          {
            setName: 'Set C - Finishing Phase',
            scheduledPeriod: '01 Jul 2026 - 30 Sep 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'H-Frame Scaffolding', quantity: 80 },
                { name: 'Cross Brace', quantity: 120 },
                { name: 'Walk Board', quantity: 60 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  - Delivery Request: ${delivery1.requestId}`);

  const delivery2 = await prisma.deliveryRequest.create({
    data: {
      requestId: 'DR-2026-002',
      customerName: 'XYZ Development Sdn Bhd',
      agreementNo: 'RA-2026-002',
      customerPhone: '+60 11-222 3333',
      customerEmail: 'ops@xyzdevelopment.com.my',
      deliveryAddress: 'Jalan Damansara, Damansara Heights, 50490 Kuala Lumpur',
      deliveryType: 'delivery',
      totalSets: 2,
      deliveredSets: 0,
      sets: {
        create: [
          {
            setName: 'Set A - Podium Level',
            scheduledPeriod: '01 Feb 2026 - 31 Jul 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'Steel Tube 4m', quantity: 200 },
                { name: 'Joint Pin', quantity: 150 },
                { name: 'Base Jack', quantity: 80 },
                { name: 'Safety Net', quantity: 40 },
              ],
            },
          },
          {
            setName: 'Set B - Tower Level',
            scheduledPeriod: '01 Aug 2026 - 31 Jan 2027',
            status: 'Pending',
            items: {
              create: [
                { name: 'Heavy Duty Tube 6m', quantity: 180 },
                { name: 'Beam Clamp', quantity: 120 },
                { name: 'Toe Board', quantity: 90 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  - Delivery Request: ${delivery2.requestId}`);

  const delivery3 = await prisma.deliveryRequest.create({
    data: {
      requestId: 'DR-2026-003',
      customerName: 'DEF Builders Sdn Bhd',
      agreementNo: 'RA-2026-003',
      customerPhone: '+60 13-456 7890',
      customerEmail: 'site@defbuilders.com.my',
      deliveryAddress: 'Jalan Ipoh, Batu, 51200 Kuala Lumpur',
      deliveryType: 'delivery',
      totalSets: 2,
      deliveredSets: 0,
      sets: {
        create: [
          {
            setName: 'Set A - Station Platform',
            scheduledPeriod: '01 Dec 2025 - 31 Aug 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'Aluminum Scaffolding 3m', quantity: 250 },
                { name: 'Platform Deck', quantity: 100 },
                { name: 'Guard Rail', quantity: 80 },
              ],
            },
          },
          {
            setName: 'Set B - Tunnel Works',
            scheduledPeriod: '01 Sep 2026 - 31 May 2027',
            status: 'Pending',
            items: {
              create: [
                { name: 'Heavy Duty Frame', quantity: 150 },
                { name: 'Support Bracket', quantity: 200 },
                { name: 'Safety Mesh', quantity: 60 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  - Delivery Request: ${delivery3.requestId}`);

  const delivery4 = await prisma.deliveryRequest.create({
    data: {
      requestId: 'DR-2026-004',
      customerName: 'Megah Engineering Sdn Bhd',
      agreementNo: 'RA-2026-004',
      customerPhone: '+60 16-765 4321',
      customerEmail: 'megah.project@megah.com.my',
      deliveryAddress: 'Jalan Sultan Ismail, 50250 Kuala Lumpur',
      deliveryType: 'pickup',
      totalSets: 1,
      deliveredSets: 0,
      sets: {
        create: [
          {
            setName: 'Set A - Facade Works',
            scheduledPeriod: '15 Jan 2026 - 14 Jul 2026',
            status: 'Pending',
            items: {
              create: [
                { name: 'Hanging Scaffold', quantity: 50 },
                { name: 'Work Platform', quantity: 40 },
                { name: 'Safety Harness Point', quantity: 30 },
                { name: 'Edge Protection', quantity: 60 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  - Delivery Request: ${delivery4.requestId}`);

  // Create sample return requests
  console.log("Creating sample return requests...");

  // Delete existing return requests to avoid duplicates
  await prisma.returnRequest.deleteMany({
    where: {
      requestId: {
        in: ['RR-2026-001', 'RR-2026-002', 'RR-2026-003', 'RR-2026-004'],
      },
    },
  });

  const return1 = await prisma.returnRequest.create({
    data: {
      requestId: 'RR-2026-001',
      customerName: 'Elite Scaffolding Services Sdn Bhd',
      agreementNo: 'RA-2026-008',
      setName: 'Set A - TRX Finishing',
      reason: 'Project completed - All equipment to be returned',
      pickupAddress: 'Jalan Tun Razak, TRX, 55188 Kuala Lumpur',
      customerPhone: '+60 14-333 4444',
      customerEmail: 'returns@elitescaffolding.com.my',
      returnType: 'full',
      collectionMethod: 'transport',
      status: 'Requested',
      items: {
        create: [
          { name: 'Scaffolding Pipe 6m', quantity: 80 },
          { name: 'Coupler Standard', quantity: 160 },
          { name: 'Base Plate', quantity: 40 },
          { name: 'Walk Board', quantity: 50 },
        ],
      },
    },
  });
  console.log(`  - Return Request: ${return1.requestId}`);

  const return2 = await prisma.returnRequest.create({
    data: {
      requestId: 'RR-2026-002',
      customerName: 'Megah Engineering Sdn Bhd',
      agreementNo: 'RA-2026-004',
      setName: 'Set A - Facade Works (Partial)',
      reason: 'Partial return - Facade work on lower floors completed',
      pickupAddress: 'Jalan Sultan Ismail, 50250 Kuala Lumpur',
      customerPhone: '+60 16-765 4321',
      customerEmail: 'megah.project@megah.com.my',
      returnType: 'partial',
      collectionMethod: 'self-return',
      status: 'Requested',
      items: {
        create: [
          { name: 'Hanging Scaffold', quantity: 20 },
          { name: 'Work Platform', quantity: 15 },
        ],
      },
    },
  });
  console.log(`  - Return Request: ${return2.requestId}`);

  const return3 = await prisma.returnRequest.create({
    data: {
      requestId: 'RR-2026-003',
      customerName: 'Sunrise Development Sdn Bhd',
      agreementNo: 'RA-2026-007',
      setName: 'Set A - Bridge Maintenance',
      reason: 'Maintenance work completed ahead of schedule',
      pickupAddress: 'Penang Second Bridge, Batu Maung, 11960 Penang',
      customerPhone: '+60 17-222 3333',
      customerEmail: 'project@sunrisedevelopment.com.my',
      returnType: 'full',
      collectionMethod: 'transport',
      status: 'Requested',
      items: {
        create: [
          { name: 'Heavy Duty Tube 6m', quantity: 100 },
          { name: 'Beam Clamp', quantity: 80 },
          { name: 'Support Frame', quantity: 40 },
          { name: 'Safety Net', quantity: 30 },
        ],
      },
    },
  });
  console.log(`  - Return Request: ${return3.requestId}`);

  const return4 = await prisma.returnRequest.create({
    data: {
      requestId: 'RR-2026-004',
      customerName: 'ABC Construction Sdn Bhd',
      agreementNo: 'RA-2026-001',
      setName: 'Set A - Foundation Phase (Partial)',
      reason: 'Partial return - Foundation work completed, reducing equipment',
      pickupAddress: 'Jalan Stesen Sentral 5, KL Sentral, 50470 Kuala Lumpur',
      customerPhone: '+60 12-345 6789',
      customerEmail: 'project@abcconstruction.com.my',
      returnType: 'partial',
      collectionMethod: 'self-return',
      status: 'Requested',
      items: {
        create: [
          { name: 'Scaffolding Pipe 6m', quantity: 30 },
          { name: 'Coupler Standard', quantity: 60 },
          { name: 'Base Plate', quantity: 15 },
        ],
      },
    },
  });
  console.log(`  - Return Request: ${return4.requestId}`);

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
