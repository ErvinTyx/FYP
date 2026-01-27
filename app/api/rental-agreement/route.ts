import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Roles allowed to manage rental agreements
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

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
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Rental agreement updated successfully',
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
        versions: updatedAgreement.versions.map(v => ({
          ...v,
          allowedRoles: v.allowedRoles ? JSON.parse(v.allowedRoles) : [],
          createdAt: v.createdAt.toISOString(),
        })),
      },
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
