import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    const agreements = await prisma.rentalAgreement.findMany({
      where,
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
        rfq: {
          include: {
            items: true,
          },
        },
        deposits: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data for the frontend
    const transformedAgreements = agreements.map(agreement => ({
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
      transportation: agreement.transportation,
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
      status: agreement.status,
      currentVersion: agreement.currentVersion,
      createdBy: agreement.createdBy,
      createdAt: agreement.createdAt.toISOString(),
      updatedAt: agreement.updatedAt.toISOString(),
      rfqId: agreement.rfqId,
      rfq: agreement.rfq ? {
        id: agreement.rfq.id,
        rfqNumber: agreement.rfq.rfqNumber,
        customerName: agreement.rfq.customerName,
        customerEmail: agreement.rfq.customerEmail,
        projectName: agreement.rfq.projectName,
        totalAmount: Number(agreement.rfq.totalAmount),
        items: agreement.rfq.items.map(item => ({
          id: item.id,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      } : null,
      deposits: agreement.deposits.map(d => ({
        id: d.id,
        depositNumber: d.depositNumber,
        depositAmount: Number(d.depositAmount),
        status: d.status,
        dueDate: d.dueDate.toISOString(),
      })),
      versions: agreement.versions.map(v => ({
        id: v.id,
        versionNumber: v.versionNumber,
        changes: v.changes,
        allowedRoles: v.allowedRoles ? JSON.parse(v.allowedRoles) : [],
        createdBy: v.createdBy,
        createdAt: v.createdAt.toISOString(),
      })),
    }));

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
      agreementNumber,
      poNumber,
      projectName,
      owner,
      ownerPhone,
      hirer,
      hirerPhone,
      location,
      termOfHire,
      transportation,
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

    // Validate required fields
    if (!agreementNumber || !projectName || !owner || !hirer) {
      return NextResponse.json(
        { success: false, message: 'Agreement number, project name, owner, and hirer are required' },
        { status: 400 }
      );
    }

    // Check if agreement number already exists
    const existingAgreement = await prisma.rentalAgreement.findUnique({
      where: { agreementNumber },
    });

    if (existingAgreement) {
      return NextResponse.json(
        { success: false, message: 'An agreement with this number already exists' },
        { status: 400 }
      );
    }

    // Create the rental agreement with initial version
    const newAgreement = await prisma.rentalAgreement.create({
      data: {
        agreementNumber,
        poNumber: poNumber || null,
        projectName,
        owner,
        ownerPhone: ownerPhone || null,
        hirer,
        hirerPhone: hirerPhone || null,
        location: location || null,
        termOfHire: termOfHire || null,
        transportation: transportation || null,
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

    // Check if agreement exists with RFQ and deposits
    const existingAgreement = await prisma.rentalAgreement.findUnique({
      where: { id },
      include: {
        rfq: true,
        deposits: true,
      },
    });

    if (!existingAgreement) {
      return NextResponse.json(
        { success: false, message: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Check if this update includes a signed document upload (new document being added)
    const isNewDocumentUpload = 
      updateData.signedDocumentUrl && 
      !existingAgreement.signedDocumentUrl;

    // Increment version and update
    const newVersion = existingAgreement.currentVersion + 1;

    const updatedAgreement = await prisma.rentalAgreement.update({
      where: { id },
      data: {
        ...updateData,
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
        rfq: true,
        deposits: true,
      },
    });

    // Auto-create deposit when signed document is uploaded
    let createdDeposit = null;
    const rfqToUse = updatedAgreement.rfq || (updateData.rfqId ? await prisma.rFQ.findUnique({ where: { id: updateData.rfqId } }) : null);
    
    if (isNewDocumentUpload && rfqToUse && existingAgreement.deposits.length === 0) {
      // Calculate deposit amount: RFQ.totalAmount × 30 × securityDeposit (months)
      const rfqTotalAmount = Number(rfqToUse.totalAmount);
      const securityDepositMonths = Number(updatedAgreement.securityDeposit);
      const depositAmount = rfqTotalAmount * 30 * securityDepositMonths;

      if (depositAmount > 0) {
        // Generate deposit number
        const depositNumber = await generateDepositNumber();

        // Calculate due date (14 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        // Create deposit
        createdDeposit = await prisma.deposit.create({
          data: {
            depositNumber,
            agreementId: id,
            depositAmount,
            status: 'Pending Payment',
            dueDate,
          },
        });
      }
    }

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
        rfq: updatedAgreement.rfq ? {
          id: updatedAgreement.rfq.id,
          rfqNumber: updatedAgreement.rfq.rfqNumber,
          customerName: updatedAgreement.rfq.customerName,
          totalAmount: Number(updatedAgreement.rfq.totalAmount),
        } : null,
        versions: updatedAgreement.versions.map(v => ({
          ...v,
          allowedRoles: v.allowedRoles ? JSON.parse(v.allowedRoles) : [],
          createdAt: v.createdAt.toISOString(),
        })),
      },
      deposit: createdDeposit ? {
        id: createdDeposit.id,
        depositNumber: createdDeposit.depositNumber,
        depositAmount: Number(createdDeposit.depositAmount),
        status: createdDeposit.status,
        dueDate: createdDeposit.dueDate.toISOString(),
      } : null,
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
