import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendDepositRejectionEmail } from '@/lib/email';

// Roles allowed to manage deposits
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];
const APPROVAL_ROLES = ['super_user', 'admin', 'finance'];

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
 * Check and update overdue status for a deposit
 */
function checkOverdueStatus(deposit: { status: string; dueDate: Date }): string {
  if (deposit.status === 'Pending Payment' && new Date() > deposit.dueDate) {
    return 'Overdue';
  }
  return deposit.status;
}

/**
 * GET /api/deposit
 * List all deposits with filtering and lazy overdue detection
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
        { success: false, message: 'Forbidden: You do not have permission to view deposits' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const agreementId = searchParams.get('agreementId');
    const customerName = searchParams.get('customerName');

    // If id is provided, return single deposit
    if (id) {
      const deposit = await prisma.deposit.findUnique({
        where: { id },
        include: {
          agreement: {
            include: {
              rfq: {
                include: {
                  items: true,
                },
              },
            },
          },
        },
      });

      if (!deposit) {
        return NextResponse.json(
          { success: false, message: 'Deposit not found' },
          { status: 404 }
        );
      }

      // Check and update overdue status
      const currentStatus = checkOverdueStatus(deposit);
      if (currentStatus !== deposit.status) {
        await prisma.deposit.update({
          where: { id },
          data: { status: currentStatus },
        });
      }

      return NextResponse.json({
        success: true,
        deposit: {
          ...deposit,
          status: currentStatus,
          depositAmount: Number(deposit.depositAmount),
          dueDate: deposit.dueDate.toISOString(),
          paymentProofUploadedAt: deposit.paymentProofUploadedAt?.toISOString(),
          paymentSubmittedAt: deposit.paymentSubmittedAt?.toISOString(),
          approvedAt: deposit.approvedAt?.toISOString(),
          rejectedAt: deposit.rejectedAt?.toISOString(),
          createdAt: deposit.createdAt.toISOString(),
          updatedAt: deposit.updatedAt.toISOString(),
          agreement: {
            ...deposit.agreement,
            monthlyRental: Number(deposit.agreement.monthlyRental),
            securityDeposit: Number(deposit.agreement.securityDeposit),
            minimumCharges: Number(deposit.agreement.minimumCharges),
            defaultInterest: Number(deposit.agreement.defaultInterest),
            createdAt: deposit.agreement.createdAt.toISOString(),
            updatedAt: deposit.agreement.updatedAt.toISOString(),
            rfq: deposit.agreement.rfq ? {
              ...deposit.agreement.rfq,
              totalAmount: Number(deposit.agreement.rfq.totalAmount),
              items: deposit.agreement.rfq.items.map(item => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
              })),
            } : null,
          },
        },
      });
    }

    // Build where clause for list
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (agreementId) {
      where.agreementId = agreementId;
    }
    if (customerName) {
      where.agreement = {
        hirer: {
          contains: customerName,
        },
      };
    }

    // Pagination and order: page (default 1), pageSize (5, 10, 25, 50), orderBy (latest | earliest)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const rawPageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);
    const pageSize = [5, 10, 25, 50].includes(rawPageSize) ? rawPageSize : 10;
    const orderByParam = searchParams.get('orderBy') ?? 'latest';
    const orderDir = orderByParam === 'earliest' ? 'asc' : 'desc';
    const skip = (page - 1) * pageSize;

    const total = await prisma.deposit.count({ where });

    const deposits = await prisma.deposit.findMany({
      where,
      include: {
        agreement: {
          include: {
            rfq: true,
          },
        },
      },
      orderBy: {
        createdAt: orderDir,
      },
      skip,
      take: pageSize,
    });

    // Check and update overdue statuses
    const depositsToUpdate: string[] = [];
    const transformedDeposits = deposits.map(deposit => {
      const currentStatus = checkOverdueStatus(deposit);
      if (currentStatus !== deposit.status) {
        depositsToUpdate.push(deposit.id);
      }
      return {
        ...deposit,
        status: currentStatus,
        depositAmount: Number(deposit.depositAmount),
        dueDate: deposit.dueDate.toISOString(),
        paymentProofUploadedAt: deposit.paymentProofUploadedAt?.toISOString(),
        paymentSubmittedAt: deposit.paymentSubmittedAt?.toISOString(),
        approvedAt: deposit.approvedAt?.toISOString(),
        rejectedAt: deposit.rejectedAt?.toISOString(),
        createdAt: deposit.createdAt.toISOString(),
        updatedAt: deposit.updatedAt.toISOString(),
        agreement: {
          ...deposit.agreement,
          monthlyRental: Number(deposit.agreement.monthlyRental),
          securityDeposit: Number(deposit.agreement.securityDeposit),
          minimumCharges: Number(deposit.agreement.minimumCharges),
          defaultInterest: Number(deposit.agreement.defaultInterest),
          createdAt: deposit.agreement.createdAt.toISOString(),
          updatedAt: deposit.agreement.updatedAt.toISOString(),
          rfq: deposit.agreement.rfq ? {
            ...deposit.agreement.rfq,
            totalAmount: Number(deposit.agreement.rfq.totalAmount),
          } : null,
        },
      };
    });

    // Batch update overdue deposits
    if (depositsToUpdate.length > 0) {
      await prisma.deposit.updateMany({
        where: {
          id: {
            in: depositsToUpdate,
          },
        },
        data: {
          status: 'Overdue',
        },
      });
    }

    return NextResponse.json({
      success: true,
      deposits: transformedDeposits,
      total,
      page,
      pageSize,
      orderBy: orderByParam,
    });
  } catch (error) {
    console.error('Get deposits error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching deposits' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deposit
 * Create a new deposit manually (usually auto-created when agreement doc uploaded)
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
        { success: false, message: 'Forbidden: You do not have permission to create deposits' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { agreementId, depositAmount: manualAmount } = body;

    if (!agreementId) {
      return NextResponse.json(
        { success: false, message: 'Agreement ID is required' },
        { status: 400 }
      );
    }

    // Get agreement with RFQ
    const agreement = await prisma.rentalAgreement.findUnique({
      where: { id: agreementId },
      include: {
        rfq: true,
        deposits: true,
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { success: false, message: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Check if deposit already exists for this agreement
    if (agreement.deposits.length > 0) {
      return NextResponse.json(
        { success: false, message: 'A deposit already exists for this agreement' },
        { status: 400 }
      );
    }

    // Calculate deposit amount: RFQ.totalAmount × securityDeposit (months)
    let depositAmount = manualAmount;
    if (!depositAmount && agreement.rfq) {
      const rfqTotalAmount = Number(agreement.rfq.totalAmount);
      const securityDepositMonths = Number(agreement.securityDeposit);
      depositAmount = rfqTotalAmount * securityDepositMonths;
    }

    if (!depositAmount || depositAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Unable to calculate deposit amount. Please ensure the agreement has a linked RFQ with items or provide a manual amount.' },
        { status: 400 }
      );
    }

    // Generate deposit number
    const depositNumber = await generateDepositNumber();

    // Calculate due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Create deposit
    const newDeposit = await prisma.deposit.create({
      data: {
        depositNumber,
        agreementId,
        depositAmount,
        status: 'Pending Payment',
        dueDate,
      },
      include: {
        agreement: {
          include: {
            rfq: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Deposit created successfully',
      deposit: {
        ...newDeposit,
        depositAmount: Number(newDeposit.depositAmount),
        dueDate: newDeposit.dueDate.toISOString(),
        createdAt: newDeposit.createdAt.toISOString(),
        updatedAt: newDeposit.updatedAt.toISOString(),
        agreement: {
          ...newDeposit.agreement,
          monthlyRental: Number(newDeposit.agreement.monthlyRental),
          securityDeposit: Number(newDeposit.agreement.securityDeposit),
        },
      },
    });
  } catch (error) {
    console.error('Create deposit error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the deposit' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/deposit
 * Update deposit - handles various actions:
 * - upload-proof: Upload payment proof document
 * - approve: Approve deposit with reference number
 * - reject: Reject deposit with reason (sends email)
 * - reset-due-date: Reset due date for overdue deposits
 * - mark-expired: Mark deposit as expired
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
        { success: false, message: 'Forbidden: You do not have permission to update deposits' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, action, ...actionData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Deposit ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }

    // Get existing deposit
    const deposit = await prisma.deposit.findUnique({
      where: { id },
      include: {
        agreement: {
          include: {
            rfq: true,
          },
        },
      },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, message: 'Deposit not found' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};
    let responseMessage = '';

    switch (action) {
      case 'upload-proof': {
        // Validate current status allows proof upload
        const allowedStatuses = ['Pending Payment', 'Overdue', 'Rejected'];
        if (!allowedStatuses.includes(deposit.status)) {
          return NextResponse.json(
            { success: false, message: `Cannot upload proof when deposit status is ${deposit.status}` },
            { status: 400 }
          );
        }

        const { paymentProofUrl, paymentProofFileName } = actionData;
        if (!paymentProofUrl) {
          return NextResponse.json(
            { success: false, message: 'Payment proof URL is required' },
            { status: 400 }
          );
        }

        updateData = {
          paymentProofUrl,
          paymentProofFileName: paymentProofFileName || null,
          paymentProofUploadedAt: new Date(),
          paymentProofUploadedBy: session.user.email,
          paymentSubmittedAt: new Date(),
          status: 'Pending Approval',
          // Clear rejection fields when re-uploading
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
        };
        responseMessage = 'Payment proof uploaded successfully';
        break;
      }

      case 'approve': {
        // Only specific roles can approve
        const canApprove = session.user.roles?.some(role => APPROVAL_ROLES.includes(role));
        if (!canApprove) {
          return NextResponse.json(
            { success: false, message: 'You do not have permission to approve deposits' },
            { status: 403 }
          );
        }

        if (deposit.status !== 'Pending Approval') {
          return NextResponse.json(
            { success: false, message: 'Only deposits with Pending Approval status can be approved' },
            { status: 400 }
          );
        }

        const { referenceNumber } = actionData;
        if (!referenceNumber) {
          return NextResponse.json(
            { success: false, message: 'Reference number is required for approval' },
            { status: 400 }
          );
        }

        updateData = {
          status: 'Paid',
          approvedBy: session.user.email,
          approvedAt: new Date(),
          referenceNumber,
        };
        responseMessage = 'Deposit approved successfully';
        break;
      }

      case 'reject': {
        // Only specific roles can reject
        const canReject = session.user.roles?.some(role => APPROVAL_ROLES.includes(role));
        if (!canReject) {
          return NextResponse.json(
            { success: false, message: 'You do not have permission to reject deposits' },
            { status: 403 }
          );
        }

        if (deposit.status !== 'Pending Approval') {
          return NextResponse.json(
            { success: false, message: 'Only deposits with Pending Approval status can be rejected' },
            { status: 400 }
          );
        }

        const { rejectionReason } = actionData;
        if (!rejectionReason) {
          return NextResponse.json(
            { success: false, message: 'Rejection reason is required' },
            { status: 400 }
          );
        }

        updateData = {
          status: 'Rejected',
          rejectedBy: session.user.email,
          rejectedAt: new Date(),
          rejectionReason,
        };

        // Send rejection email to the person who uploaded the payment proof
        if (deposit.paymentProofUploadedBy) {
          const customerEmail = deposit.agreement.rfq?.customerEmail || deposit.paymentProofUploadedBy;
          const customerName = deposit.agreement.hirer;
          
          await sendDepositRejectionEmail(
            customerEmail,
            customerName,
            deposit.depositNumber,
            rejectionReason,
            Number(deposit.depositAmount)
          );
        }

        responseMessage = 'Deposit rejected and notification sent';
        break;
      }

      case 'reset-due-date': {
        // Can only reset due date for Overdue deposits
        if (deposit.status !== 'Overdue') {
          return NextResponse.json(
            { success: false, message: 'Can only reset due date for overdue deposits' },
            { status: 400 }
          );
        }

        const { newDueDate } = actionData;
        if (!newDueDate) {
          return NextResponse.json(
            { success: false, message: 'New due date is required' },
            { status: 400 }
          );
        }

        const parsedDueDate = new Date(newDueDate);
        if (parsedDueDate <= new Date()) {
          return NextResponse.json(
            { success: false, message: 'New due date must be in the future' },
            { status: 400 }
          );
        }

        updateData = {
          dueDate: parsedDueDate,
          status: 'Pending Payment',
        };
        responseMessage = 'Due date reset successfully';
        break;
      }

      case 'mark-expired': {
        // Can mark overdue deposits as expired
        if (deposit.status !== 'Overdue') {
          return NextResponse.json(
            { success: false, message: 'Can only mark overdue deposits as expired' },
            { status: 400 }
          );
        }

        updateData = {
          status: 'Expired',
        };
        responseMessage = 'Deposit marked as expired';
        break;
      }

      case 'remove-proof': {
        // Cannot remove proof after payment is approved
        if (deposit.status === 'Paid') {
          return NextResponse.json(
            { success: false, message: 'Cannot remove proof after payment is approved' },
            { status: 400 }
          );
        }

        // Must have proof to remove
        if (!deposit.paymentProofUrl) {
          return NextResponse.json(
            { success: false, message: 'No proof of payment to remove' },
            { status: 400 }
          );
        }

        updateData = {
          paymentProofUrl: null,
          paymentProofFileName: null,
          paymentProofUploadedAt: null,
          paymentSubmittedAt: null,
          status: 'Pending Payment',
        };
        responseMessage = 'Payment proof removed successfully';
        break;
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update the deposit
    const updatedDeposit = await prisma.deposit.update({
      where: { id },
      data: updateData,
      include: {
        agreement: {
          include: {
            rfq: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: responseMessage,
      deposit: {
        ...updatedDeposit,
        depositAmount: Number(updatedDeposit.depositAmount),
        dueDate: updatedDeposit.dueDate.toISOString(),
        paymentProofUploadedAt: updatedDeposit.paymentProofUploadedAt?.toISOString(),
        paymentSubmittedAt: updatedDeposit.paymentSubmittedAt?.toISOString(),
        approvedAt: updatedDeposit.approvedAt?.toISOString(),
        rejectedAt: updatedDeposit.rejectedAt?.toISOString(),
        createdAt: updatedDeposit.createdAt.toISOString(),
        updatedAt: updatedDeposit.updatedAt.toISOString(),
        agreement: {
          ...updatedDeposit.agreement,
          monthlyRental: Number(updatedDeposit.agreement.monthlyRental),
          securityDeposit: Number(updatedDeposit.agreement.securityDeposit),
        },
      },
    });
  } catch (error) {
    console.error('Update deposit error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the deposit' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deposit
 * Delete a deposit (admin only)
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
        { success: false, message: 'Forbidden: Only admin can delete deposits' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Deposit ID is required' },
        { status: 400 }
      );
    }

    // Check if deposit exists
    const existingDeposit = await prisma.deposit.findUnique({
      where: { id },
    });

    if (!existingDeposit) {
      return NextResponse.json(
        { success: false, message: 'Deposit not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of non-paid deposits
    if (existingDeposit.status === 'Paid') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete a paid deposit' },
        { status: 400 }
      );
    }

    // Delete the deposit
    await prisma.deposit.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Deposit deleted successfully',
    });
  } catch (error) {
    console.error('Delete deposit error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting the deposit' },
      { status: 500 }
    );
  }
}
