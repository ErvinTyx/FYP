import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { computeTermOfHireFromRfqItems } from '../../../src/lib/term-of-hire';

// Roles allowed to manage rental agreements
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

/**
 * Generate a unique deposit number in format DEP-YYYYMMDD-XXX
 */
async function generateDepositNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `DEP-${dateStr}-`;
  
  // Find the latest deposit number for today
  const latestDeposit = await prisma.deposit.findFirst({
    where: {
      depositNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      depositNumber: 'desc',
    },
  });
  
  let sequence = 1;
  if (latestDeposit) {
    const lastSequence = parseInt(latestDeposit.depositNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(3, '0')}`;
}

/** Build a snapshot of agreement state for version history (JSON-serializable). */
function buildAgreementSnapshot(agreement: {
  agreementNumber: string;
  poNumber: string | null;
  projectName: string;
  owner: string;
  ownerPhone: string | null;
  hirer: string;
  hirerPhone: string | null;
  location: string | null;
  termOfHire: string | null;
  monthlyRental: unknown;
  securityDeposit: unknown;
  minimumCharges: unknown;
  defaultInterest: unknown;
  ownerSignatoryName: string | null;
  ownerNRIC: string | null;
  hirerSignatoryName: string | null;
  hirerNRIC: string | null;
  status: string;
  ownerSignatureDate?: Date | null;
  hirerSignatureDate?: Date | null;
  [k: string]: unknown;
}): Record<string, unknown> {
  return {
    agreementNumber: agreement.agreementNumber,
    poNumber: agreement.poNumber,
    projectName: agreement.projectName,
    owner: agreement.owner,
    ownerPhone: agreement.ownerPhone,
    hirer: agreement.hirer,
    hirerPhone: agreement.hirerPhone,
    location: agreement.location,
    termOfHire: agreement.termOfHire,
    monthlyRental: Number(agreement.monthlyRental),
    securityDeposit: Number(agreement.securityDeposit),
    minimumCharges: Number(agreement.minimumCharges),
    defaultInterest: Number(agreement.defaultInterest),
    ownerSignatoryName: agreement.ownerSignatoryName,
    ownerNRIC: agreement.ownerNRIC,
    hirerSignatoryName: agreement.hirerSignatoryName,
    hirerNRIC: agreement.hirerNRIC,
    status: agreement.status,
    ownerSignatureDate: agreement.ownerSignatureDate?.toISOString() ?? null,
    hirerSignatureDate: agreement.hirerSignatureDate?.toISOString() ?? null,
  };
}

/**
 * GET /api/rental-agreement
 * List all rental agreements with their versions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to view rental agreements' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const agreementNumber = searchParams.get('agreementNumber');
    const includeRfqItems = searchParams.get('includeRfqItems') === 'true';
    const withRfqOnly = searchParams.get('withRfqOnly') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (agreementNumber) {
      where.agreementNumber = {
        contains: agreementNumber,
      };
    }
    // Filter to only agreements with linked RFQ if requested
    if (withRfqOnly) {
      where.rfqId = { not: null };
    }

    const agreements = await prisma.rentalAgreement.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      // Always include rfq (for totalAmount in list); include items only when requested
      include: {
        rfq: includeRfqItems
          ? { include: { items: true } }
          : true,
      },
    });

    // Load versions and deposits via separate queries (avoids include when client is stale)
    const ids = agreements.map((a) => a.id);
    type VersionRow = { id: string; agreementId: string; versionNumber: number; changes: string | null; allowedRoles: string | null; createdBy: string | null; createdAt: Date };
    type DepositRow = { id: string; agreementId: string; depositNumber: string; depositAmount: unknown; status: string; dueDate: Date };
    let allVersions: VersionRow[] = [];
    let allDeposits: DepositRow[] = [];
    try {
      if (ids.length > 0) {
        const prismaAny = prisma as unknown as { agreementVersion: { findMany: (o: unknown) => Promise<VersionRow[]> }; deposit: { findMany: (o: unknown) => Promise<DepositRow[]> } };
        if ('agreementVersion' in prismaAny && 'deposit' in prismaAny) {
          const [v, d] = await Promise.all([
            prismaAny.agreementVersion.findMany({ where: { agreementId: { in: ids } }, orderBy: { versionNumber: 'desc' } }),
            prismaAny.deposit.findMany({ where: { agreementId: { in: ids } } }),
          ]);
          allVersions = v;
          allDeposits = d;
        }
      }
    } catch {
      // Client may not have these models; leave arrays empty
    }

    const versionsByAgreementId = new Map<string, typeof allVersions>();
    for (const v of allVersions) {
      const list = versionsByAgreementId.get(v.agreementId) ?? [];
      list.push(v);
      versionsByAgreementId.set(v.agreementId, list);
    }
    const depositsByAgreementId = new Map<string, typeof allDeposits>();
    for (const d of allDeposits) {
      const list = depositsByAgreementId.get(d.agreementId) ?? [];
      list.push(d);
      depositsByAgreementId.set(d.agreementId, list);
    }

    // Type for RFQ with items
    type RFQWithItems = {
      id: string;
      rfqNumber: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      projectName: string;
      projectLocation: string;
      totalAmount: unknown;
      items: Array<{
        id: string;
        scaffoldingItemId: string;
        scaffoldingItemName: string;
        quantity: number;
        unit: string;
        unitPrice: unknown;
        totalPrice: unknown;
        setName: string;
        deliverDate: Date | null;
        returnDate: Date | null;
      }>;
    };

    const transformedAgreements = agreements.map((agreement) => {
      const a = agreement as typeof agreement & { rfqId?: string | null; rfq?: RFQWithItems | null };
      const versions = (versionsByAgreementId.get(agreement.id) ?? []).map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        changes: v.changes,
        allowedRoles: v.allowedRoles ? JSON.parse(v.allowedRoles) : [],
        createdBy: v.createdBy,
        createdAt: v.createdAt.toISOString(),
        snapshot: (v as { snapshot?: unknown }).snapshot ?? null,
      }));
      const deposits = (depositsByAgreementId.get(agreement.id) ?? []).map((d) => ({
        id: d.id,
        depositNumber: d.depositNumber,
        depositAmount: Number(d.depositAmount),
        status: d.status,
        dueDate: d.dueDate.toISOString(),
      }));

      // Transform RFQ data if included
      const rfqData = a.rfq ? {
        id: a.rfq.id,
        rfqNumber: a.rfq.rfqNumber,
        customerName: a.rfq.customerName,
        customerEmail: a.rfq.customerEmail,
        customerPhone: a.rfq.customerPhone,
        projectName: a.rfq.projectName,
        projectLocation: a.rfq.projectLocation,
        totalAmount: Number(a.rfq.totalAmount),
        items: a.rfq.items?.map((item) => ({
          id: item.id,
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          setName: item.setName,
          deliverDate: item.deliverDate?.toISOString() ?? null,
          returnDate: item.returnDate?.toISOString() ?? null,
        })) ?? [],
      } : null;

      return {
        id: agreement.id,
        agreementNumber: agreement.agreementNumber,
        poNumber: agreement.poNumber,
        projectName: agreement.projectName,
        owner: agreement.owner,
        ownerPhone: agreement.ownerPhone,
        hirer: agreement.hirer,
        hirerPhone: agreement.hirerPhone,
      location: agreement.location,
      termOfHire: agreement.termOfHire,
      monthlyRental: Number(agreement.monthlyRental),
        securityDeposit: Number(agreement.securityDeposit),
        minimumCharges: Number(agreement.minimumCharges),
        defaultInterest: Number(agreement.defaultInterest),
        ownerSignatoryName: agreement.ownerSignatoryName,
        ownerNRIC: agreement.ownerNRIC,
        hirerSignatoryName: agreement.hirerSignatoryName,
        hirerNRIC: agreement.hirerNRIC,
        ownerSignature: agreement.ownerSignature,
        hirerSignature: agreement.hirerSignature,
        ownerSignatureDate: agreement.ownerSignatureDate?.toISOString(),
        hirerSignatureDate: agreement.hirerSignatureDate?.toISOString(),
        signedDocumentUrl: agreement.signedDocumentUrl,
        signedDocumentUploadedAt: agreement.signedDocumentUploadedAt?.toISOString(),
        signedDocumentUploadedBy: agreement.signedDocumentUploadedBy,
        signedStatus: (agreement as { signedStatus?: string | null }).signedStatus ?? null,
        status: agreement.status,
        currentVersion: agreement.currentVersion,
        createdBy: agreement.createdBy,
        createdAt: agreement.createdAt.toISOString(),
        updatedAt: agreement.updatedAt.toISOString(),
        rfqId: a.rfqId ?? null,
        rfq: rfqData,
        deposits,
        versions,
      };
    });

    return NextResponse.json({
      success: true,
      agreements: transformedAgreements,
    });
  } catch (error) {
    console.error('Get rental agreements error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching rental agreements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rental-agreement
 * Create a new rental agreement
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to create rental agreements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      projectName,
      owner,
      ownerPhone,
      hirer,
      hirerPhone,
      location,
      termOfHire,
      monthlyRental,
      securityDeposit,
      minimumCharges,
      defaultInterest,
      ownerSignatoryName,
      ownerNRIC,
      hirerSignatoryName,
      hirerNRIC,
      status,
      allowedRoles,
      rfqId,
    } = body;

    // Validate required fields (agreement number and PO number are auto-generated)
    if (!projectName || !owner || !hirer) {
      return NextResponse.json(
        { success: false, message: 'Project name, owner, and hirer are required' },
        { status: 400 }
      );
    }

    // Autofill termOfHire from RFQ items when rfqId is provided and client did not send termOfHire (treat whitespace as empty)
    const termTrimmed = typeof termOfHire === 'string' ? termOfHire.trim() : '';
    let resolvedTermOfHire: string | null = termTrimmed !== '' ? termTrimmed : null;
    if (rfqId && !resolvedTermOfHire) {
      const computed = await computeTermOfHireFromRfqItems(prisma, rfqId);
      if (computed) resolvedTermOfHire = computed;
    }

    // Auto-generate unique Rental Agreement Number (RA-YYYY-NNN)
    const year = new Date().getFullYear();
    const prefixRa = `RA-${year}-`;
    const lastRa = await prisma.rentalAgreement.findFirst({
      where: { agreementNumber: { startsWith: prefixRa } },
      orderBy: { agreementNumber: 'desc' },
    });
    let nextRaNum = 1;
    if (lastRa) {
      const match = lastRa.agreementNumber.match(new RegExp(`${prefixRa}(\\d+)`));
      if (match) nextRaNum = parseInt(match[1], 10) + 1;
    }
    const agreementNumber = `${prefixRa}${String(nextRaNum).padStart(3, '0')}`;

    // Auto-generate unique P/O Number (PO-YYYY-NNN)
    const prefixPo = `PO-${year}-`;
    const agreementsWithPo = await prisma.rentalAgreement.findMany({
      where: { poNumber: { not: null, startsWith: prefixPo } },
      select: { poNumber: true },
    });
    let maxPoNum = 0;
    const poRegex = new RegExp(`^${prefixPo.replace(/-/g, '\\-')}(\\d+)$`);
    for (const a of agreementsWithPo) {
      const m = a.poNumber?.match(poRegex);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxPoNum) maxPoNum = n;
      }
    }
    const poNumber = `${prefixPo}${String(maxPoNum + 1).padStart(3, '0')}`;

    // Create the rental agreement with initial version
    const newAgreement = await prisma.rentalAgreement.create({
      data: {
        agreementNumber,
        poNumber,
        projectName,
        owner,
        ownerPhone: ownerPhone || null,
        hirer,
        hirerPhone: hirerPhone || null,
        location: location || null,
        termOfHire: resolvedTermOfHire,
        monthlyRental: monthlyRental || 0,
        securityDeposit: securityDeposit || 0,
        minimumCharges: minimumCharges || 0,
        defaultInterest: defaultInterest || 0,
        ownerSignatoryName: ownerSignatoryName || null,
        ownerNRIC: ownerNRIC || null,
        hirerSignatoryName: hirerSignatoryName || null,
        hirerNRIC: hirerNRIC || null,
        status: status || 'Draft',
        currentVersion: 1,
        createdBy: session.user.email,
        rfqId: rfqId || null,
        versions: {
          create: {
            versionNumber: 1,
            changes: 'Initial agreement created',
            allowedRoles: JSON.stringify(allowedRoles || ['Admin', 'Manager', 'Sales', 'Finance']),
            createdBy: session.user.email,
            ...({ snapshot: buildAgreementSnapshot({
              agreementNumber,
              poNumber,
              projectName,
              owner,
              ownerPhone: ownerPhone || null,
              hirer,
              hirerPhone: hirerPhone || null,
              location: location || null,
              termOfHire: resolvedTermOfHire,
              monthlyRental: monthlyRental || 0,
              securityDeposit: securityDeposit || 0,
              minimumCharges: minimumCharges || 0,
              defaultInterest: defaultInterest || 0,
              ownerSignatoryName: ownerSignatoryName || null,
              ownerNRIC: ownerNRIC || null,
              hirerSignatoryName: hirerSignatoryName || null,
              hirerNRIC: hirerNRIC || null,
              status: status || 'Draft',
            }) } as Record<string, unknown>),
          },
        },
      },
      include: {
        versions: true,
        rfq: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Rental agreement created successfully',
      agreement: {
        ...newAgreement,
        monthlyRental: Number(newAgreement.monthlyRental),
        securityDeposit: Number(newAgreement.securityDeposit),
        minimumCharges: Number(newAgreement.minimumCharges),
        defaultInterest: Number(newAgreement.defaultInterest),
        createdAt: newAgreement.createdAt.toISOString(),
        updatedAt: newAgreement.updatedAt.toISOString(),
        rfq: newAgreement.rfq ? {
          id: newAgreement.rfq.id,
          rfqNumber: newAgreement.rfq.rfqNumber,
          customerName: newAgreement.rfq.customerName,
          totalAmount: Number(newAgreement.rfq.totalAmount),
        } : null,
        versions: newAgreement.versions.map(v => ({
          ...v,
          allowedRoles: v.allowedRoles ? JSON.parse(v.allowedRoles) : [],
          createdAt: v.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Create rental agreement error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the rental agreement' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rental-agreement
 * Update an existing rental agreement
 * Auto-creates deposit when signed document is uploaded and agreement has linked RFQ
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to update rental agreements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, changes, allowedRoles, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Agreement ID is required' },
        { status: 400 }
      );
    }

    // Check if agreement exists
    const existingAgreement = await prisma.rentalAgreement.findUnique({
      where: { id },
    });

    if (!existingAgreement) {
      return NextResponse.json(
        { success: false, message: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Only scalar fields allowed for update (exclude relations and read-only fields from body)
    const scalarFields = [
      'agreementNumber', 'poNumber', 'projectName', 'owner', 'ownerPhone', 'hirer', 'hirerPhone',
      'location', 'termOfHire', 'monthlyRental', 'securityDeposit', 'minimumCharges',
      'defaultInterest', 'ownerSignatoryName', 'ownerNRIC', 'hirerSignatoryName', 'hirerNRIC',
      'ownerSignature', 'hirerSignature', 'ownerSignatureDate', 'hirerSignatureDate',
      'signedDocumentUrl', 'signedDocumentUploadedAt', 'signedDocumentUploadedBy', 'signedStatus', 'status', 'createdBy',
    ] as const;
    const dataForUpdate: Record<string, unknown> = {};
    for (const key of scalarFields) {
      if (key in updateData && updateData[key] !== undefined) {
        dataForUpdate[key] = updateData[key];
      }
    }
    // Omit rfqId from update when client is stale (client may reject rfqId; run npx prisma generate to get full schema)

    // Autofill termOfHire from RFQ items when current value is empty and agreement has rfqId (treat whitespace as empty)
    const incomingTerm = dataForUpdate.termOfHire;
    const termEmpty = incomingTerm == null || (typeof incomingTerm === 'string' && incomingTerm.trim() === '');
    const existingWithRfq = existingAgreement as { rfqId?: string | null };
    if (termEmpty && existingWithRfq.rfqId) {
      const computed = await computeTermOfHireFromRfqItems(prisma, existingWithRfq.rfqId);
      if (computed) dataForUpdate.termOfHire = computed;
    }

    // Check if we need deposit count (for auto-create deposit logic)
    let existingDepositCount = 0;
    try {
      const prismaAny = prisma as unknown as { deposit: { count: (args: { where: { agreementId: string } }) => Promise<number> } };
      if ('deposit' in prismaAny) {
        existingDepositCount = await prismaAny.deposit.count({ where: { agreementId: id } });
      }
    } catch {
      // ignore
    }

    // Whenever the request includes a non-empty signed document URL, set signedStatus so the agreement appears on Project Closure
    const hasSignedDocumentUrl =
      dataForUpdate.signedDocumentUrl != null &&
      String(dataForUpdate.signedDocumentUrl).trim() !== '';
    if (hasSignedDocumentUrl) {
      dataForUpdate.signedStatus = 'completed';
    }

    const isNewDocumentUpload =
      hasSignedDocumentUrl &&
      !existingAgreement.signedDocumentUrl;

    // Save snapshot of current state into the current version (so v1 stays v1 after edit)
    const snapshot = buildAgreementSnapshot(existingAgreement);
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE `AgreementVersion` SET `snapshot` = ? WHERE `agreementId` = ? AND `versionNumber` = ?',
        JSON.stringify(snapshot),
        id,
        existingAgreement.currentVersion
      );
    } catch (e) {
      // snapshot column may not exist yet; run: npx prisma migrate deploy && npx prisma generate
      console.warn('Version snapshot update skipped:', e);
    }

    // Increment version and update
    const newVersion = existingAgreement.currentVersion + 1;

    const updatedAgreement = await prisma.rentalAgreement.update({
      where: { id },
      data: {
        ...dataForUpdate,
        currentVersion: newVersion,
        versions: {
          create: {
            versionNumber: newVersion,
            changes: changes || 'Agreement updated',
            allowedRoles: JSON.stringify(allowedRoles || ['Admin', 'Manager']),
            createdBy: session.user.email,
          },
        },
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
    });

    // Auto-create deposit when signed document is uploaded
    let createdDeposit = null;
    let rfqToUse: { totalAmount: unknown } | null = null;
    try {
      const ag = updatedAgreement as typeof updatedAgreement & { rfqId?: string | null; rfq?: { totalAmount: unknown } | null };
      if (ag.rfqId) {
        rfqToUse = await prisma.rFQ.findUnique({ where: { id: ag.rfqId } });
      }
    } catch {
      // ignore
    }

    if (isNewDocumentUpload && rfqToUse && existingDepositCount === 0) {
      // Calculate deposit amount: RFQ.totalAmount × 30 × securityDeposit (months)
      const rfqTotalAmount = Number(rfqToUse.totalAmount);
      const securityDepositMonths = Number(updatedAgreement.securityDeposit);
      const depositAmount = rfqTotalAmount * securityDepositMonths;

      if (depositAmount > 0) {
        const depositNumber = await generateDepositNumber();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        try {
          const prismaAny = prisma as unknown as { deposit: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> } };
          if ('deposit' in prismaAny) {
            createdDeposit = await prismaAny.deposit.create({
              data: {
                depositNumber,
                agreementId: id,
                depositAmount,
                status: 'Pending Payment',
                dueDate,
              },
            });
          }
        } catch {
          // client may not have deposit model
        }
      }
    }

    const agOut = updatedAgreement as typeof updatedAgreement & { rfq?: { id: string; rfqNumber: string; customerName: string; totalAmount: unknown } | null };
    return NextResponse.json({
      success: true,
      message: createdDeposit
        ? 'Rental agreement updated and deposit created successfully'
        : 'Rental agreement updated successfully',
      agreement: {
        ...updatedAgreement,
        monthlyRental: Number(updatedAgreement.monthlyRental),
        securityDeposit: Number(updatedAgreement.securityDeposit),
        minimumCharges: Number(updatedAgreement.minimumCharges),
        defaultInterest: Number(updatedAgreement.defaultInterest),
        createdAt: updatedAgreement.createdAt.toISOString(),
        updatedAt: updatedAgreement.updatedAt.toISOString(),
        ownerSignatureDate: updatedAgreement.ownerSignatureDate?.toISOString(),
        hirerSignatureDate: updatedAgreement.hirerSignatureDate?.toISOString(),
        signedDocumentUploadedAt: updatedAgreement.signedDocumentUploadedAt?.toISOString(),
        rfq: agOut.rfq ? {
          id: agOut.rfq.id,
          rfqNumber: agOut.rfq.rfqNumber,
          customerName: agOut.rfq.customerName,
          totalAmount: Number(agOut.rfq.totalAmount),
        } : null,
        versions: updatedAgreement.versions.map((v) => ({
          ...v,
          allowedRoles: v.allowedRoles ? JSON.parse(v.allowedRoles) : [],
          createdAt: v.createdAt.toISOString(),
        })),
      },
      deposit: createdDeposit ? (() => {
        const d = createdDeposit as { id: string; depositNumber: string; depositAmount: unknown; status: string; dueDate: Date };
        return { id: d.id, depositNumber: d.depositNumber, depositAmount: Number(d.depositAmount), status: d.status, dueDate: d.dueDate.toISOString() };
      })() : null,
    });
  } catch (error) {
    console.error('Update rental agreement error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the rental agreement' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rental-agreement
 * Delete a rental agreement
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin/super_user can delete
    const hasAdminRole = session.user.roles?.some(role => ['super_user', 'admin'].includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin can delete rental agreements' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Agreement ID is required' },
        { status: 400 }
      );
    }

    // Check if agreement exists
    const existingAgreement = await prisma.rentalAgreement.findUnique({
      where: { id },
    });

    if (!existingAgreement) {
      return NextResponse.json(
        { success: false, message: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Delete the agreement (versions will cascade delete)
    await prisma.rentalAgreement.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Rental agreement deleted successfully',
    });
  } catch (error) {
    console.error('Delete rental agreement error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting the rental agreement' },
      { status: 500 }
    );
  }
}
