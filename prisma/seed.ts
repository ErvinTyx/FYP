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

  // Create sample RFQs (Quotations) FIRST - before agreements that link to them
  console.log("Creating sample RFQs (Quotations)...");

  // Delete all existing deposits and RFQs for a fresh seed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).deposit.deleteMany({});
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

  // RFQ 4 - For deposit testing (Pending Payment)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq4 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20260125-00004',
      customerName: 'Megah Engineering Sdn Bhd',
      customerEmail: 'procurement@megaheng.com.my',
      customerPhone: '+60 16-765 4321',
      projectName: 'Setia Sky Residences Tower B',
      projectLocation: 'Jalan Sultan Ismail, 50250 Kuala Lumpur',
      requestedDate: new Date('2026-01-25'),
      requiredDate: new Date('2026-02-10'),
      status: 'approved',
      totalAmount: 500, // RM500 daily rate
      notes: 'Residential high-rise scaffolding',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-011', scaffoldingItemName: 'CRAB STANDARD 0.75M C60', quantity: 150, unit: 'pcs', unitPrice: 1.21, totalPrice: 181.5 },
          { scaffoldingItemId: 'SC-012', scaffoldingItemName: 'CRAB TRIANGLE 1.5M', quantity: 100, unit: 'pcs', unitPrice: 2.78, totalPrice: 278 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantity: 50, unit: 'pcs', unitPrice: 1.30, totalPrice: 65 },
        ],
      },
    },
  });
  console.log(`  - RFQ: ${rfq4.rfqNumber} (${rfq4.customerName})`);

  // RFQ 5 - For deposit testing (Overdue)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq5 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20260110-00005',
      customerName: 'Urban Construction Sdn Bhd',
      customerEmail: 'project@urbanconstruction.com.my',
      customerPhone: '+60 17-888 9999',
      projectName: 'Urban Heights Condominium',
      projectLocation: 'Jalan Ampang, 50450 Kuala Lumpur',
      requestedDate: new Date('2026-01-10'),
      requiredDate: new Date('2026-01-20'),
      status: 'approved',
      totalAmount: 350, // RM350 daily rate
      notes: 'Condominium project scaffolding',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-003', scaffoldingItemName: 'CRAB STANDARD 1.00M C60', quantity: 100, unit: 'pcs', unitPrice: 1.46, totalPrice: 146 },
          { scaffoldingItemId: 'SC-007', scaffoldingItemName: 'CRAB LEDGER 0.70M', quantity: 200, unit: 'pcs', unitPrice: 0.56, totalPrice: 112 },
          { scaffoldingItemId: 'SC-015', scaffoldingItemName: 'CRAB U-HEAD C60 / 600', quantity: 50, unit: 'pcs', unitPrice: 2.07, totalPrice: 103.5 },
        ],
      },
    },
  });
  console.log(`  - RFQ: ${rfq5.rfqNumber} (${rfq5.customerName})`);

  // RFQ 6 - For deposit testing (Pending Approval)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq6 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20260118-00006',
      customerName: 'BuildRight Inc.',
      customerEmail: 'accounts@buildright.com.my',
      customerPhone: '+60 12-555 6666',
      projectName: 'BuildRight Office Tower',
      projectLocation: 'Bangsar South, 59200 Kuala Lumpur',
      requestedDate: new Date('2026-01-18'),
      requiredDate: new Date('2026-02-01'),
      status: 'approved',
      totalAmount: 600, // RM600 daily rate
      notes: 'Commercial office tower scaffolding',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-006', scaffoldingItemName: 'CRAB STANDARD 2.00M C60', quantity: 180, unit: 'pcs', unitPrice: 2.59, totalPrice: 466.2 },
          { scaffoldingItemId: 'SC-004', scaffoldingItemName: 'CRAB LEDGER 1.50M', quantity: 120, unit: 'pcs', unitPrice: 1.12, totalPrice: 134.4 },
        ],
      },
    },
  });
  console.log(`  - RFQ: ${rfq6.rfqNumber} (${rfq6.customerName})`);

  // Link agreements to RFQs and update with signed documents for deposit creation
  console.log("Linking agreements to RFQs...");

  // Update Agreement 1 with RFQ link and signed document
  await prisma.rentalAgreement.update({
    where: { id: agreement1.id },
    data: {
      rfqId: rfq1.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2026001.pdf',
      signedDocumentUploadedAt: new Date('2026-01-16'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
    },
  });
  console.log(`  - Linked ${agreement1.agreementNumber} to ${rfq1.rfqNumber}`);

  // Update Agreement 2 with RFQ link and signed document
  await prisma.rentalAgreement.update({
    where: { id: agreement2.id },
    data: {
      rfqId: rfq2.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2026002.pdf',
      signedDocumentUploadedAt: new Date('2026-01-21'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
    },
  });
  console.log(`  - Linked ${agreement2.agreementNumber} to ${rfq2.rfqNumber}`);

  // Update Agreement 3 with RFQ link and signed document
  await prisma.rentalAgreement.update({
    where: { id: agreement3.id },
    data: {
      rfqId: rfq3.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2026003.pdf',
      signedDocumentUploadedAt: new Date('2026-01-12'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
    },
  });
  console.log(`  - Linked ${agreement3.agreementNumber} to ${rfq3.rfqNumber}`);

  // Update Agreement 4 with RFQ link and signed document
  await prisma.rentalAgreement.update({
    where: { id: agreement4.id },
    data: {
      rfqId: rfq4.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2026004.pdf',
      signedDocumentUploadedAt: new Date('2026-01-26'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
    },
  });
  console.log(`  - Linked ${agreement4.agreementNumber} to ${rfq4.rfqNumber}`);

  // Create additional agreements for deposit testing
  console.log("Creating additional agreements for deposit testing...");

  // Agreement 5 - For Overdue deposit
  const agreement5 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-005",
      poNumber: "PO-2026-005",
      projectName: "Urban Heights Condominium",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Urban Construction Sdn Bhd",
      hirerPhone: "+60 17-888 9999",
      location: "Jalan Ampang, 50450 Kuala Lumpur",
      termOfHire: "8 months (01 Jan 2026 - 31 Aug 2026)",
      transportation: "Included - Delivery & Collection",
      monthlyRental: 10500,
      securityDeposit: 2,
      minimumCharges: 2,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "David Wong",
      hirerNRIC: "880225-14-7654",
      status: "Active",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      rfqId: rfq5.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2026005.pdf',
      signedDocumentUploadedAt: new Date('2026-01-11'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
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
  console.log(`  - Agreement: ${agreement5.agreementNumber} (${agreement5.projectName})`);

  // Agreement 6 - For Pending Approval deposit
  const agreement6 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-006",
      poNumber: "PO-2026-006",
      projectName: "BuildRight Office Tower",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "BuildRight Inc.",
      hirerPhone: "+60 12-555 6666",
      location: "Bangsar South, 59200 Kuala Lumpur",
      termOfHire: "10 months (01 Feb 2026 - 30 Nov 2026)",
      transportation: "Included - Delivery Only",
      monthlyRental: 18000,
      securityDeposit: 3,
      minimumCharges: 3,
      defaultInterest: 2.0,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "James Tan",
      hirerNRIC: "790610-10-3456",
      status: "Active",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      rfqId: rfq6.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2026006.pdf',
      signedDocumentUploadedAt: new Date('2026-01-19'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
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
  console.log(`  - Agreement: ${agreement6.agreementNumber} (${agreement6.projectName})`);

  // Create sample deposits
  console.log("Creating sample deposits...");

  // Calculate due dates
  const today = new Date();
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14);
  
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);
  
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);

  // Deposit 1 - PAID (Agreement 1 - ABC Construction)
  // Deposit Amount = RFQ totalAmount × 30 × securityDeposit = 25000 × 30 × 2 = RM 1,500,000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit1 = await (prisma as any).deposit.create({
    data: {
      depositNumber: 'DEP-20260117-001',
      agreementId: agreement1.id,
      depositAmount: 1500000,
      status: 'Paid',
      dueDate: new Date('2026-01-30'),
      paymentProofUrl: '/uploads/payment-proofs/payment_proof_dep001.pdf',
      paymentProofFileName: 'Bank_Transfer_Receipt_ABC.pdf',
      paymentProofUploadedAt: new Date('2026-01-20'),
      paymentProofUploadedBy: 'project@abcconstruction.com.my',
      paymentSubmittedAt: new Date('2026-01-20'),
      approvedBy: 'finance@powermetalsteel.com',
      approvedAt: new Date('2026-01-21'),
      referenceNumber: 'MBB-2026012100123456',
    },
  });
  console.log(`  - Deposit: ${deposit1.depositNumber} (PAID - ${rfq1.customerName})`);

  // Deposit 2 - PAID (Agreement 2 - XYZ Development)
  // Deposit Amount = 38000 × 30 × 3 = RM 3,420,000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit2 = await (prisma as any).deposit.create({
    data: {
      depositNumber: 'DEP-20260122-001',
      agreementId: agreement2.id,
      depositAmount: 3420000,
      status: 'Paid',
      dueDate: new Date('2026-02-04'),
      paymentProofUrl: '/uploads/payment-proofs/payment_proof_dep002.pdf',
      paymentProofFileName: 'CIMB_Transfer_XYZ.pdf',
      paymentProofUploadedAt: new Date('2026-01-25'),
      paymentProofUploadedBy: 'ops@xyzdevelopment.com.my',
      paymentSubmittedAt: new Date('2026-01-25'),
      approvedBy: 'finance@powermetalsteel.com',
      approvedAt: new Date('2026-01-26'),
      referenceNumber: 'CIMB-2026012600789012',
    },
  });
  console.log(`  - Deposit: ${deposit2.depositNumber} (PAID - ${rfq2.customerName})`);

  // Deposit 3 - PENDING PAYMENT (Agreement 4 - Megah Engineering)
  // Deposit Amount = 500 × 30 × 2 = RM 30,000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit3 = await (prisma as any).deposit.create({
    data: {
      depositNumber: 'DEP-20260127-001',
      agreementId: agreement4.id,
      depositAmount: 30000,
      status: 'Pending Payment',
      dueDate: twoWeeksFromNow,
    },
  });
  console.log(`  - Deposit: ${deposit3.depositNumber} (PENDING PAYMENT - ${rfq4.customerName})`);

  // Deposit 4 - OVERDUE (Agreement 5 - Urban Construction)
  // Deposit Amount = 350 × 30 × 2 = RM 21,000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit4 = await (prisma as any).deposit.create({
    data: {
      depositNumber: 'DEP-20260112-001',
      agreementId: agreement5.id,
      depositAmount: 21000,
      status: 'Overdue',
      dueDate: oneWeekAgo,
    },
  });
  console.log(`  - Deposit: ${deposit4.depositNumber} (OVERDUE - ${rfq5.customerName})`);

  // Deposit 5 - PENDING APPROVAL (Agreement 6 - BuildRight)
  // Deposit Amount = 600 × 30 × 3 = RM 54,000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit5 = await (prisma as any).deposit.create({
    data: {
      depositNumber: 'DEP-20260120-001',
      agreementId: agreement6.id,
      depositAmount: 54000,
      status: 'Pending Approval',
      dueDate: new Date('2026-02-02'),
      paymentProofUrl: '/uploads/payment-proofs/payment_proof_dep005.pdf',
      paymentProofFileName: 'HLB_Transfer_BuildRight.pdf',
      paymentProofUploadedAt: new Date('2026-01-28'),
      paymentProofUploadedBy: 'accounts@buildright.com.my',
      paymentSubmittedAt: new Date('2026-01-28'),
    },
  });
  console.log(`  - Deposit: ${deposit5.depositNumber} (PENDING APPROVAL - ${rfq6.customerName})`);

  // Deposit 6 - REJECTED (Need to create another agreement)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq7 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20260105-00007',
      customerName: 'Premium Projects Sdn Bhd',
      customerEmail: 'finance@premiumprojects.com.my',
      customerPhone: '+60 16-345 6789',
      projectName: 'Premium Plaza Commercial Center',
      projectLocation: 'Jalan Bukit Bintang, 55100 Kuala Lumpur',
      requestedDate: new Date('2026-01-05'),
      requiredDate: new Date('2026-01-15'),
      status: 'approved',
      totalAmount: 420,
      notes: 'Commercial center scaffolding',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-003', scaffoldingItemName: 'CRAB STANDARD 1.00M C60', quantity: 120, unit: 'pcs', unitPrice: 1.46, totalPrice: 175.2 },
          { scaffoldingItemId: 'SC-005', scaffoldingItemName: 'CRAB BRACE H2 X L1.50M', quantity: 100, unit: 'pcs', unitPrice: 1.50, totalPrice: 150 },
          { scaffoldingItemId: 'SC-012', scaffoldingItemName: 'CRAB TRIANGLE 1.5M', quantity: 50, unit: 'pcs', unitPrice: 2.78, totalPrice: 139 },
        ],
      },
    },
  });
  
  const agreement7 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-007",
      poNumber: "PO-2026-007",
      projectName: "Premium Plaza Commercial Center",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Premium Projects Sdn Bhd",
      hirerPhone: "+60 16-345 6789",
      location: "Jalan Bukit Bintang, 55100 Kuala Lumpur",
      termOfHire: "6 months (15 Jan 2026 - 14 Jul 2026)",
      transportation: "Excluded - Self Collection",
      monthlyRental: 12600,
      securityDeposit: 2,
      minimumCharges: 2,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Michael Ooi",
      hirerNRIC: "830715-10-9876",
      status: "Active",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      rfqId: rfq7.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2026007.pdf',
      signedDocumentUploadedAt: new Date('2026-01-08'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
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

  // Deposit 6 - REJECTED
  // Deposit Amount = 420 × 30 × 2 = RM 25,200
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit6 = await (prisma as any).deposit.create({
    data: {
      depositNumber: 'DEP-20260109-001',
      agreementId: agreement7.id,
      depositAmount: 25200,
      status: 'Rejected',
      dueDate: new Date('2026-01-22'),
      paymentProofUrl: '/uploads/payment-proofs/payment_proof_dep006_rejected.jpg',
      paymentProofFileName: 'Blurry_Screenshot.jpg',
      paymentProofUploadedAt: new Date('2026-01-15'),
      paymentProofUploadedBy: 'finance@premiumprojects.com.my',
      paymentSubmittedAt: new Date('2026-01-15'),
      rejectedBy: 'finance@powermetalsteel.com',
      rejectedAt: new Date('2026-01-16'),
      rejectionReason: 'The payment proof image is blurry and the transaction details are not visible. Please upload a clearer image showing the full transaction details including date, amount, and reference number.',
    },
  });
  console.log(`  - Deposit: ${deposit6.depositNumber} (REJECTED - Premium Projects)`);

  // Deposit 7 - EXPIRED
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq8 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20251215-00008',
      customerName: 'Metro Builders Sdn Bhd',
      customerEmail: 'accounts@metrobuilders.com.my',
      customerPhone: '+60 13-777 8888',
      projectName: 'Metro Shopping Mall Extension',
      projectLocation: 'Jalan Tun Razak, 50400 Kuala Lumpur',
      requestedDate: new Date('2025-12-15'),
      requiredDate: new Date('2025-12-25'),
      status: 'approved',
      totalAmount: 280,
      notes: 'Shopping mall extension project',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-001', scaffoldingItemName: 'CRAB BASIC STANDARD C60', quantity: 200, unit: 'pcs', unitPrice: 0.59, totalPrice: 118 },
          { scaffoldingItemId: 'SC-007', scaffoldingItemName: 'CRAB LEDGER 0.70M', quantity: 150, unit: 'pcs', unitPrice: 0.56, totalPrice: 84 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantity: 60, unit: 'pcs', unitPrice: 1.30, totalPrice: 78 },
        ],
      },
    },
  });
  
  const agreement8 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2025-008",
      poNumber: "PO-2025-008",
      projectName: "Metro Shopping Mall Extension",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Metro Builders Sdn Bhd",
      hirerPhone: "+60 13-777 8888",
      location: "Jalan Tun Razak, 50400 Kuala Lumpur",
      termOfHire: "4 months (01 Jan 2026 - 30 Apr 2026)",
      transportation: "Included - Delivery & Collection",
      monthlyRental: 8400,
      securityDeposit: 2,
      minimumCharges: 1,
      defaultInterest: 1.5,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Robert Chen",
      hirerNRIC: "750920-14-5432",
      status: "Terminated",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      rfqId: rfq8.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2025008.pdf',
      signedDocumentUploadedAt: new Date('2025-12-18'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
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

  // Deposit 7 - EXPIRED
  // Deposit Amount = 280 × 30 × 2 = RM 16,800
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit7 = await (prisma as any).deposit.create({
    data: {
      depositNumber: 'DEP-20251219-001',
      agreementId: agreement8.id,
      depositAmount: 16800,
      status: 'Expired',
      dueDate: new Date('2026-01-02'),
    },
  });
  console.log(`  - Deposit: ${deposit7.depositNumber} (EXPIRED - Metro Builders)`);

  // Deposit 8 - Another PENDING PAYMENT (for variety)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq9 = await (prisma as any).rFQ.create({
    data: {
      rfqNumber: 'RFQ-20260128-00009',
      customerName: 'Sunrise Holdings Sdn Bhd',
      customerEmail: 'procurement@sunriseholdings.com.my',
      customerPhone: '+60 19-123 4567',
      projectName: 'Sunrise Business Park Tower A',
      projectLocation: 'Mont Kiara, 50480 Kuala Lumpur',
      requestedDate: new Date('2026-01-28'),
      requiredDate: new Date('2026-02-10'),
      status: 'approved',
      totalAmount: 550,
      notes: 'Business park development',
      createdBy: 'superadmin@powermetalsteel.com',
      items: {
        create: [
          { scaffoldingItemId: 'SC-006', scaffoldingItemName: 'CRAB STANDARD 2.00M C60', quantity: 150, unit: 'pcs', unitPrice: 2.59, totalPrice: 388.5 },
          { scaffoldingItemId: 'SC-008', scaffoldingItemName: 'CRAB LEDGER 1.00M', quantity: 100, unit: 'pcs', unitPrice: 0.77, totalPrice: 77 },
          { scaffoldingItemId: 'SC-015', scaffoldingItemName: 'CRAB U-HEAD C60 / 600', quantity: 40, unit: 'pcs', unitPrice: 2.07, totalPrice: 82.8 },
        ],
      },
    },
  });
  
  const agreement9 = await prisma.rentalAgreement.create({
    data: {
      agreementNumber: "RA-2026-009",
      poNumber: "PO-2026-009",
      projectName: "Sunrise Business Park Tower A",
      owner: "Power Metal & Steel Sdn Bhd",
      ownerPhone: "+60 3-2727 8888",
      hirer: "Sunrise Holdings Sdn Bhd",
      hirerPhone: "+60 19-123 4567",
      location: "Mont Kiara, 50480 Kuala Lumpur",
      termOfHire: "12 months (01 Feb 2026 - 31 Jan 2027)",
      transportation: "Included - Delivery Only",
      monthlyRental: 16500,
      securityDeposit: 3,
      minimumCharges: 3,
      defaultInterest: 2.0,
      ownerSignatoryName: "Ahmad bin Abdullah",
      ownerNRIC: "720101-01-5678",
      hirerSignatoryName: "Jennifer Lim",
      hirerNRIC: "860430-10-2468",
      status: "Active",
      currentVersion: 1,
      createdBy: "superadmin@powermetalsteel.com",
      rfqId: rfq9.id,
      signedDocumentUrl: '/uploads/agreements/signed_agreement_ra2026009.pdf',
      signedDocumentUploadedAt: new Date('2026-01-29'),
      signedDocumentUploadedBy: 'superadmin@powermetalsteel.com',
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

  // Deposit 8 - PENDING PAYMENT (newer)
  // Deposit Amount = 550 × 30 × 3 = RM 49,500
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit8 = await (prisma as any).deposit.create({
    data: {
      depositNumber: 'DEP-20260129-001',
      agreementId: agreement9.id,
      depositAmount: 49500,
      status: 'Pending Payment',
      dueDate: new Date('2026-02-12'),
    },
  });
  console.log(`  - Deposit: ${deposit8.depositNumber} (PENDING PAYMENT - Sunrise Holdings)`);

  console.log("Deposit sample data created successfully!");
  console.log("  Summary:");
  console.log("  - 2 PAID deposits");
  console.log("  - 2 PENDING PAYMENT deposits");
  console.log("  - 1 PENDING APPROVAL deposit");
  console.log("  - 1 REJECTED deposit");
  console.log("  - 1 OVERDUE deposit");
  console.log("  - 1 EXPIRED deposit");

  // Create sample delivery requests linked to RFQs
  console.log("Creating sample delivery requests...");

  // Delete monthly rental invoices first (they reference delivery requests)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).monthlyRentalInvoiceItem.deleteMany({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).monthlyRentalInvoice.deleteMany({});

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

  // Create sample monthly rental invoices
  console.log("Creating sample monthly rental invoices...");

  // Note: Monthly rental invoices are already deleted before delivery requests above

  // Calculate dates for invoices
  const invoiceToday = new Date();
  const invoiceOneWeekFromNow = new Date(invoiceToday);
  invoiceOneWeekFromNow.setDate(invoiceToday.getDate() + 7);
  const invoiceOneWeekAgo = new Date(invoiceToday);
  invoiceOneWeekAgo.setDate(invoiceToday.getDate() - 7);

  // Invoice 1 - PAID (Delivery 1 - ABC Construction)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mriInvoice1 = await (prisma as any).monthlyRentalInvoice.create({
    data: {
      invoiceNumber: 'MRI-20260115-001',
      deliveryRequestId: delivery1.id,
      customerName: 'ABC Construction Sdn Bhd',
      customerEmail: 'project@abcconstruction.com.my',
      customerPhone: '+60 12-345 6789',
      billingMonth: 1,
      billingYear: 2026,
      billingStartDate: new Date('2026-01-01'),
      billingEndDate: new Date('2026-01-31'),
      daysInPeriod: 31,
      baseAmount: 19902, // 100*0.59*31 + 200*2.59*31 + 50*1.30*31 = 1829+16058+2015
      overdueCharges: 0,
      totalAmount: 19902,
      status: 'Paid',
      dueDate: new Date('2026-01-22'),
      paymentProofUrl: '/uploads/payment-proofs/mri_payment_001.pdf',
      paymentProofFileName: 'Bank_Transfer_ABC_Jan2026.pdf',
      paymentProofUploadedAt: new Date('2026-01-18'),
      paymentProofUploadedBy: 'project@abcconstruction.com.my',
      approvedBy: 'finance@powermetalsteel.com',
      approvedAt: new Date('2026-01-19'),
      referenceNumber: 'MBB-2026011900456789',
      items: {
        create: [
          { scaffoldingItemId: 'SC-001', scaffoldingItemName: 'CRAB BASIC STANDARD C60', quantityBilled: 100, unitPrice: 0.59, daysCharged: 31, lineTotal: 1829 },
          { scaffoldingItemId: 'SC-006', scaffoldingItemName: 'CRAB STANDARD 2.00M C60', quantityBilled: 200, unitPrice: 2.59, daysCharged: 31, lineTotal: 16058 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantityBilled: 50, unitPrice: 1.30, daysCharged: 31, lineTotal: 2015 },
        ],
      },
    },
  });
  console.log(`  - Invoice: ${mriInvoice1.invoiceNumber} (PAID - ABC Construction)`);

  // Invoice 2 - PENDING APPROVAL (Delivery 2 - XYZ Development)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mriInvoice2 = await (prisma as any).monthlyRentalInvoice.create({
    data: {
      invoiceNumber: 'MRI-20260120-001',
      deliveryRequestId: delivery2.id,
      customerName: 'XYZ Development Sdn Bhd',
      customerEmail: 'ops@xyzdevelopment.com.my',
      customerPhone: '+60 11-222 3333',
      billingMonth: 1,
      billingYear: 2026,
      billingStartDate: new Date('2026-01-01'),
      billingEndDate: new Date('2026-01-31'),
      daysInPeriod: 31,
      baseAmount: 14954.4, // 200*1.21*31 + 150*0.56*31 + 80*1.30*31 + 40*1.31*31 = 7502+2604+3224+1624.4
      overdueCharges: 0,
      totalAmount: 14954.4,
      status: 'Pending Approval',
      dueDate: new Date('2026-01-27'),
      paymentProofUrl: '/uploads/payment-proofs/mri_payment_002.jpg',
      paymentProofFileName: 'CIMB_Transfer_XYZ.jpg',
      paymentProofUploadedAt: new Date('2026-01-26'),
      paymentProofUploadedBy: 'ops@xyzdevelopment.com.my',
      items: {
        create: [
          { scaffoldingItemId: 'SC-011', scaffoldingItemName: 'CRAB STANDARD 0.75M C60', quantityBilled: 200, unitPrice: 1.21, daysCharged: 31, lineTotal: 7502 },
          { scaffoldingItemId: 'SC-007', scaffoldingItemName: 'CRAB LEDGER 0.70M', quantityBilled: 150, unitPrice: 0.56, daysCharged: 31, lineTotal: 2604 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantityBilled: 80, unitPrice: 1.30, daysCharged: 31, lineTotal: 3224 },
          { scaffoldingItemId: 'SC-009', scaffoldingItemName: 'CRAB BRACE H2 X L0.70M', quantityBilled: 40, unitPrice: 1.31, daysCharged: 31, lineTotal: 1624.4 },
        ],
      },
    },
  });
  console.log(`  - Invoice: ${mriInvoice2.invoiceNumber} (PENDING APPROVAL - XYZ Development)`);

  // Invoice 3 - PENDING PAYMENT (newly generated)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mriInvoice3 = await (prisma as any).monthlyRentalInvoice.create({
    data: {
      invoiceNumber: 'MRI-20260125-001',
      deliveryRequestId: delivery1.id,
      customerName: 'ABC Construction Sdn Bhd',
      customerEmail: 'project@abcconstruction.com.my',
      customerPhone: '+60 12-345 6789',
      billingMonth: 2,
      billingYear: 2026,
      billingStartDate: new Date('2026-02-01'),
      billingEndDate: new Date('2026-02-28'),
      daysInPeriod: 28,
      baseAmount: 17976, // 100*0.59*28 + 200*2.59*28 + 50*1.30*28 = 1652+14504+1820
      overdueCharges: 0,
      totalAmount: 17976,
      status: 'Pending Payment',
      dueDate: invoiceOneWeekFromNow,
      items: {
        create: [
          { scaffoldingItemId: 'SC-001', scaffoldingItemName: 'CRAB BASIC STANDARD C60', quantityBilled: 100, unitPrice: 0.59, daysCharged: 28, lineTotal: 1652 },
          { scaffoldingItemId: 'SC-006', scaffoldingItemName: 'CRAB STANDARD 2.00M C60', quantityBilled: 200, unitPrice: 2.59, daysCharged: 28, lineTotal: 14504 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantityBilled: 50, unitPrice: 1.30, daysCharged: 28, lineTotal: 1820 },
        ],
      },
    },
  });
  console.log(`  - Invoice: ${mriInvoice3.invoiceNumber} (PENDING PAYMENT - ABC Construction Feb)`);

  // Invoice 4 - OVERDUE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mriInvoice4 = await (prisma as any).monthlyRentalInvoice.create({
    data: {
      invoiceNumber: 'MRI-20260110-001',
      deliveryRequestId: delivery2.id,
      customerName: 'XYZ Development Sdn Bhd',
      customerEmail: 'ops@xyzdevelopment.com.my',
      customerPhone: '+60 11-222 3333',
      billingMonth: 12,
      billingYear: 2025,
      billingStartDate: new Date('2025-12-01'),
      billingEndDate: new Date('2025-12-31'),
      daysInPeriod: 31,
      baseAmount: 14954.4, // 200*1.21*31 + 150*0.56*31 + 80*1.30*31 + 40*1.31*31 = 7502+2604+3224+1624.4
      overdueCharges: 224.32, // 1.5% of base amount = 14954.4 * 0.015
      totalAmount: 15178.72, // 14954.4 + 224.32
      status: 'Overdue',
      dueDate: invoiceOneWeekAgo,
      items: {
        create: [
          { scaffoldingItemId: 'SC-011', scaffoldingItemName: 'CRAB STANDARD 0.75M C60', quantityBilled: 200, unitPrice: 1.21, daysCharged: 31, lineTotal: 7502 },
          { scaffoldingItemId: 'SC-007', scaffoldingItemName: 'CRAB LEDGER 0.70M', quantityBilled: 150, unitPrice: 0.56, daysCharged: 31, lineTotal: 2604 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantityBilled: 80, unitPrice: 1.30, daysCharged: 31, lineTotal: 3224 },
          { scaffoldingItemId: 'SC-009', scaffoldingItemName: 'CRAB BRACE H2 X L0.70M', quantityBilled: 40, unitPrice: 1.31, daysCharged: 31, lineTotal: 1624.4 },
        ],
      },
    },
  });
  console.log(`  - Invoice: ${mriInvoice4.invoiceNumber} (OVERDUE - XYZ Development Dec 2025)`);

  // Invoice 5 - REJECTED (blurry payment proof)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mriInvoice5 = await (prisma as any).monthlyRentalInvoice.create({
    data: {
      invoiceNumber: 'MRI-20260112-001',
      deliveryRequestId: delivery1.id,
      customerName: 'ABC Construction Sdn Bhd',
      customerEmail: 'project@abcconstruction.com.my',
      customerPhone: '+60 12-345 6789',
      billingMonth: 12,
      billingYear: 2025,
      billingStartDate: new Date('2025-12-01'),
      billingEndDate: new Date('2025-12-31'),
      daysInPeriod: 31,
      baseAmount: 19902, // 100*0.59*31 + 200*2.59*31 + 50*1.30*31 = 1829+16058+2015
      overdueCharges: 0,
      totalAmount: 19902,
      status: 'Rejected',
      dueDate: new Date('2026-01-05'),
      paymentProofUrl: '/uploads/payment-proofs/mri_payment_rejected.jpg',
      paymentProofFileName: 'Blurry_Screenshot.jpg',
      paymentProofUploadedAt: new Date('2026-01-03'),
      paymentProofUploadedBy: 'project@abcconstruction.com.my',
      rejectedBy: 'finance@powermetalsteel.com',
      rejectedAt: new Date('2026-01-04'),
      rejectionReason: 'Payment proof image is unclear. Please upload a clearer screenshot showing the full transaction details including date, amount, and bank reference number.',
      items: {
        create: [
          { scaffoldingItemId: 'SC-001', scaffoldingItemName: 'CRAB BASIC STANDARD C60', quantityBilled: 100, unitPrice: 0.59, daysCharged: 31, lineTotal: 1829 },
          { scaffoldingItemId: 'SC-006', scaffoldingItemName: 'CRAB STANDARD 2.00M C60', quantityBilled: 200, unitPrice: 2.59, daysCharged: 31, lineTotal: 16058 },
          { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantityBilled: 50, unitPrice: 1.30, daysCharged: 31, lineTotal: 2015 },
        ],
      },
    },
  });
  console.log(`  - Invoice: ${mriInvoice5.invoiceNumber} (REJECTED - ABC Construction Dec 2025)`);

  console.log("Monthly rental invoice sample data created successfully!");
  console.log("  Summary:");
  console.log("  - 1 PAID invoice");
  console.log("  - 1 PENDING APPROVAL invoice");
  console.log("  - 1 PENDING PAYMENT invoice");
  console.log("  - 1 OVERDUE invoice");
  console.log("  - 1 REJECTED invoice");

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
