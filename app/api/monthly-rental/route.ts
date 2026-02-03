import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendMonthlyRentalRejectionEmail } from '@/lib/email';

// Roles allowed to manage monthly rental invoices
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];
const APPROVAL_ROLES = ['super_user', 'admin', 'finance'];

/**
 * Generate a unique invoice number in format MRI-YYYYMMDD-XXX
 */
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MRI-${dateStr}-`;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });
  
  let sequence = 1;
  if (latestInvoice) {
    const lastSequence = parseInt(latestInvoice.invoiceNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(3, '0')}`;
}

/**
 * Check and update overdue status for an invoice
 */
function checkOverdueStatus(invoice: { status: string; dueDate: Date }): string {
  if (invoice.status === 'Pending Payment' && new Date() > invoice.dueDate) {
    return 'Overdue';
  }
  return invoice.status;
}

/**
 * Calculate overdue charges based on default interest rate
 */
function calculateOverdueCharges(
  baseAmount: number,
  dueDate: Date,
  defaultInterestRate: number
): number {
  if (new Date() <= dueDate) {
    return 0;
  }
  
  const msPerMonth = 30 * 24 * 60 * 60 * 1000;
  const monthsLate = Math.ceil((Date.now() - dueDate.getTime()) / msPerMonth);
  
  return baseAmount * (defaultInterestRate / 100) * monthsLate;
}

/**
 * Calculate billing amount based on delivered items minus returned items
 */
async function calculateBillingAmount(
  deliveryRequestId: string,
  billingMonth: number,
  billingYear: number
) {
  // Get delivery request with RFQ items
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId },
    include: {
      sets: {
        where: { status: 'Completed' },
        include: { items: true },
      },
      rfq: {
        include: { items: true },
      },
    },
  });

  if (!delivery || !delivery.rfq) {
    throw new Error('Delivery request or linked RFQ not found');
  }

  // Get all returns for same agreement that are completed
  const returns = await prisma.returnRequest.findMany({
    where: {
      agreementNo: delivery.agreementNo,
      status: { in: ['Completed', 'Sorting Complete', 'Customer Notified'] },
    },
    include: { items: true },
  });

  // Calculate delivered quantities per item
  const deliveredQty: Record<string, number> = {};
  for (const set of delivery.sets) {
    for (const item of set.items) {
      const itemId = item.scaffoldingItemId || item.name;
      deliveredQty[itemId] = (deliveredQty[itemId] || 0) + item.quantity;
    }
  }

  // Calculate returned quantities per item
  const returnedQty: Record<string, number> = {};
  for (const returnReq of returns) {
    for (const item of returnReq.items) {
      const itemId = item.scaffoldingItemId || item.name;
      returnedQty[itemId] = (returnedQty[itemId] || 0) + item.quantityReturned;
    }
  }

  // Get days in billing month
  const daysInMonth = new Date(billingYear, billingMonth, 0).getDate();

  // Calculate: netQty × unitPrice × days
  let totalAmount = 0;
  const items: Array<{
    scaffoldingItemId: string;
    scaffoldingItemName: string;
    quantityBilled: number;
    unitPrice: number;
    daysCharged: number;
    lineTotal: number;
  }> = [];

  // Create a map of RFQ items for price lookup
  const rfqItemPrices: Record<string, { name: string; unitPrice: number }> = {};
  for (const rfqItem of delivery.rfq.items) {
    rfqItemPrices[rfqItem.scaffoldingItemId] = {
      name: rfqItem.scaffoldingItemName,
      unitPrice: Number(rfqItem.unitPrice),
    };
  }

  for (const itemId in deliveredQty) {
    const netQty = deliveredQty[itemId] - (returnedQty[itemId] || 0);
    if (netQty > 0) {
      const rfqItem = rfqItemPrices[itemId];
      if (rfqItem) {
        const lineTotal = netQty * rfqItem.unitPrice * daysInMonth;
        totalAmount += lineTotal;
        items.push({
          scaffoldingItemId: itemId,
          scaffoldingItemName: rfqItem.name,
          quantityBilled: netQty,
          unitPrice: rfqItem.unitPrice,
          daysCharged: daysInMonth,
          lineTotal,
        });
      }
    }
  }

  return {
    totalAmount,
    items,
    daysInMonth,
    customerName: delivery.customerName,
    customerEmail: delivery.customerEmail,
    customerPhone: delivery.customerPhone,
    agreementNo: delivery.agreementNo,
  };
}

/**
 * GET /api/monthly-rental
 * List all monthly rental invoices with filtering and lazy overdue detection
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
        { success: false, message: 'Forbidden: You do not have permission to view invoices' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const deliveryRequestId = searchParams.get('deliveryRequestId');
    const agreementId = searchParams.get('agreementId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const customerName = searchParams.get('customerName') || undefined;
    const customerEmail = searchParams.get('customerEmail') || undefined;

    // If id is provided, return single invoice
    if (id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = await (prisma as any).monthlyRentalInvoice.findUnique({
        where: { id },
        include: {
          deliveryRequest: {
            include: {
              rfq: true,
              sets: {
                include: { items: true },
              },
            },
          },
          agreement: true,
          items: true,
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { success: false, message: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Check and update overdue status
      const currentStatus = checkOverdueStatus(invoice);
      if (currentStatus !== invoice.status) {
        // Calculate overdue charges
        const defaultInterest = invoice.agreement?.defaultInterest 
          ? Number(invoice.agreement.defaultInterest) 
          : 1.5;
        const overdueCharges = calculateOverdueCharges(
          Number(invoice.baseAmount),
          invoice.dueDate,
          defaultInterest
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).monthlyRentalInvoice.update({
          where: { id },
          data: { 
            status: currentStatus,
            overdueCharges,
            totalAmount: Number(invoice.baseAmount) + overdueCharges,
          },
        });
      }

      return NextResponse.json({
        success: true,
        invoice: transformInvoice(invoice, currentStatus),
      });
    }

    // Build where clause for list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (status) {
      where.status = status;
    }
    if (deliveryRequestId) {
      where.deliveryRequestId = deliveryRequestId;
    }
    if (agreementId) {
      where.agreementId = agreementId;
    }
    if (month) {
      where.billingMonth = parseInt(month, 10);
    }
    if (year) {
      where.billingYear = parseInt(year, 10);
    }
    if (customerName) {
      where.customerName = { contains: customerName };
    }
    if (customerEmail) {
      where.customerEmail = { contains: customerEmail };
    }

    // Pagination and order: page (default 1), pageSize (5, 10, 25, 50), orderBy (latest | earliest)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const rawPageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);
    const pageSize = [5, 10, 25, 50].includes(rawPageSize) ? rawPageSize : 10;
    const orderByParam = searchParams.get('orderBy') ?? 'latest';
    const orderDir = orderByParam === 'earliest' ? 'asc' : 'desc';

    const skip = (page - 1) * pageSize;

    // Get total count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = await (prisma as any).monthlyRentalInvoice.count({ where });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = await (prisma as any).monthlyRentalInvoice.findMany({
      where,
      include: {
        deliveryRequest: {
          include: {
            rfq: true,
          },
        },
        agreement: true,
        items: true,
      },
      orderBy: {
        createdAt: orderDir,
      },
      skip,
      take: pageSize,
    });

    // Check and update overdue statuses
    const invoicesToUpdate: Array<{ id: string; overdueCharges: number; totalAmount: number }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedInvoices = invoices.map((invoice: any) => {
      const currentStatus = checkOverdueStatus(invoice);
      if (currentStatus !== invoice.status && currentStatus === 'Overdue') {
        const defaultInterest = invoice.agreement?.defaultInterest 
          ? Number(invoice.agreement.defaultInterest) 
          : 1.5;
        const overdueCharges = calculateOverdueCharges(
          Number(invoice.baseAmount),
          invoice.dueDate,
          defaultInterest
        );
        invoicesToUpdate.push({
          id: invoice.id,
          overdueCharges,
          totalAmount: Number(invoice.baseAmount) + overdueCharges,
        });
      }
      return transformInvoice(invoice, currentStatus);
    });

    // Batch update overdue invoices
    for (const update of invoicesToUpdate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).monthlyRentalInvoice.update({
        where: { id: update.id },
        data: {
          status: 'Overdue',
          overdueCharges: update.overdueCharges,
          totalAmount: update.totalAmount,
        },
      });
    }

    return NextResponse.json({
      success: true,
      invoices: transformedInvoices,
      total,
      page,
      pageSize,
      orderBy: orderByParam,
    });
  } catch (error) {
    console.error('Get monthly rental invoices error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monthly-rental
 * Generate a new monthly rental invoice
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
        { success: false, message: 'Forbidden: You do not have permission to create invoices' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { deliveryRequestId, billingMonth, billingYear, agreementId } = body;

    if (!deliveryRequestId) {
      return NextResponse.json(
        { success: false, message: 'Delivery Request ID is required' },
        { status: 400 }
      );
    }

    // Use current month/year if not provided
    const now = new Date();
    const targetMonth = billingMonth || (now.getMonth() + 1);
    const targetYear = billingYear || now.getFullYear();

    // Check if invoice already exists for this delivery and month
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
      where: {
        deliveryRequestId,
        billingMonth: targetMonth,
        billingYear: targetYear,
      },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { success: false, message: `Invoice already exists for ${targetMonth}/${targetYear}` },
        { status: 400 }
      );
    }

    // Calculate billing amount
    const billing = await calculateBillingAmount(
      deliveryRequestId,
      targetMonth,
      targetYear
    );

    if (billing.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No billable items found. All items may have been returned.' },
        { status: 400 }
      );
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate billing period dates
    const billingStartDate = new Date(targetYear, targetMonth - 1, 1);
    const billingEndDate = new Date(targetYear, targetMonth, 0);

    // Calculate due date (7 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Create invoice with items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newInvoice = await (prisma as any).monthlyRentalInvoice.create({
      data: {
        invoiceNumber,
        deliveryRequestId,
        agreementId: agreementId || null,
        customerName: billing.customerName,
        customerEmail: billing.customerEmail,
        customerPhone: billing.customerPhone,
        billingMonth: targetMonth,
        billingYear: targetYear,
        billingStartDate,
        billingEndDate,
        daysInPeriod: billing.daysInMonth,
        baseAmount: billing.totalAmount,
        overdueCharges: 0,
        totalAmount: billing.totalAmount,
        status: 'Pending Payment',
        dueDate,
        items: {
          create: billing.items,
        },
      },
      include: {
        deliveryRequest: {
          include: {
            rfq: true,
          },
        },
        agreement: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Monthly rental invoice created successfully',
      invoice: transformInvoice(newInvoice, newInvoice.status),
    });
  } catch (error) {
    console.error('Create monthly rental invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the invoice' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/monthly-rental
 * Update invoice - handles various actions:
 * - upload-proof: Upload payment proof document
 * - approve: Approve invoice with reference number
 * - reject: Reject invoice with reason (sends email)
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
        { success: false, message: 'Forbidden: You do not have permission to update invoices' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, action, ...actionData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }

    // Get existing invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = await (prisma as any).monthlyRentalInvoice.findUnique({
      where: { id },
      include: {
        deliveryRequest: {
          include: {
            rfq: true,
          },
        },
        agreement: true,
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateData: Record<string, any> = {};
    let responseMessage = '';

    switch (action) {
      case 'upload-proof': {
        // Validate current status allows proof upload
        const allowedStatuses = ['Pending Payment', 'Overdue', 'Rejected'];
        if (!allowedStatuses.includes(invoice.status)) {
          return NextResponse.json(
            { success: false, message: `Cannot upload proof when invoice status is ${invoice.status}` },
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
            { success: false, message: 'You do not have permission to approve invoices' },
            { status: 403 }
          );
        }

        if (invoice.status !== 'Pending Approval') {
          return NextResponse.json(
            { success: false, message: 'Only invoices with Pending Approval status can be approved' },
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
        responseMessage = 'Invoice approved successfully';
        break;
      }

      case 'reject': {
        // Only specific roles can reject
        const canReject = session.user.roles?.some(role => APPROVAL_ROLES.includes(role));
        if (!canReject) {
          return NextResponse.json(
            { success: false, message: 'You do not have permission to reject invoices' },
            { status: 403 }
          );
        }

        if (invoice.status !== 'Pending Approval') {
          return NextResponse.json(
            { success: false, message: 'Only invoices with Pending Approval status can be rejected' },
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
        const customerEmail = invoice.customerEmail || invoice.paymentProofUploadedBy;
        if (customerEmail) {
          await sendMonthlyRentalRejectionEmail(
            customerEmail,
            invoice.customerName,
            invoice.invoiceNumber,
            rejectionReason,
            Number(invoice.totalAmount)
          );
        }

        responseMessage = 'Invoice rejected and notification sent';
        break;
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update the invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedInvoice = await (prisma as any).monthlyRentalInvoice.update({
      where: { id },
      data: updateData,
      include: {
        deliveryRequest: {
          include: {
            rfq: true,
          },
        },
        agreement: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: responseMessage,
      invoice: transformInvoice(updatedInvoice, updatedInvoice.status),
    });
  } catch (error) {
    console.error('Update monthly rental invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the invoice' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monthly-rental
 * Delete an invoice (admin only)
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
        { success: false, message: 'Forbidden: Only admin can delete invoices' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Check if invoice exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingInvoice = await (prisma as any).monthlyRentalInvoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of non-paid invoices
    if (existingInvoice.status === 'Paid') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete a paid invoice' },
        { status: 400 }
      );
    }

    // Delete the invoice (items will cascade delete)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).monthlyRentalInvoice.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('Delete monthly rental invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting the invoice' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to transform invoice for response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformInvoice(invoice: any, currentStatus: string) {
  return {
    ...invoice,
    status: currentStatus,
    baseAmount: Number(invoice.baseAmount),
    overdueCharges: Number(invoice.overdueCharges),
    totalAmount: Number(invoice.totalAmount),
    dueDate: invoice.dueDate.toISOString(),
    billingStartDate: invoice.billingStartDate.toISOString(),
    billingEndDate: invoice.billingEndDate.toISOString(),
    paymentProofUploadedAt: invoice.paymentProofUploadedAt?.toISOString(),
    approvedAt: invoice.approvedAt?.toISOString(),
    rejectedAt: invoice.rejectedAt?.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    items: invoice.items.map((item: { unitPrice: unknown; lineTotal: unknown }) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    deliveryRequest: invoice.deliveryRequest ? {
      ...invoice.deliveryRequest,
      rfq: invoice.deliveryRequest.rfq ? {
        ...invoice.deliveryRequest.rfq,
        totalAmount: Number(invoice.deliveryRequest.rfq.totalAmount),
      } : null,
    } : null,
    agreement: invoice.agreement ? {
      ...invoice.agreement,
      monthlyRental: Number(invoice.agreement.monthlyRental),
      securityDeposit: Number(invoice.agreement.securityDeposit),
      minimumCharges: Number(invoice.agreement.minimumCharges),
      defaultInterest: Number(invoice.agreement.defaultInterest),
    } : null,
  };
}
