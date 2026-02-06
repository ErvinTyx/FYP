/**
 * RFQ Service Module
 * Module: Request for Quotation (RFQ)
 * Purpose: Handle RFQ data operations with MySQL database via Prisma ORM
 * 
 * This service manages:
 * - RFQ creation and storage
 * - RFQ item management
 * - RFQ status updates
 * - RFQ data retrieval and filtering
 */

import { prisma } from '../lib/prisma';
import { RFQ, RFQItem } from '../types/rfq';

export interface CreateRFQPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  projectLocation: string;
  requestedDate: string;
  status: string;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  items: CreateRFQItemPayload[];
}

export interface CreateRFQItemPayload {
  setName: string;
  requiredDate: string;
  rentalMonths: number;
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface UpdateRFQPayload {
  rfqId: string;
  status?: string;
  totalAmount?: number;
  notes?: string;
  items?: CreateRFQItemPayload[];
}

/**
 * Create a new RFQ record in the database
 * @param payload - RFQ data to be saved
 * @returns Created RFQ object with database ID
 */
export async function createRFQ(payload: CreateRFQPayload): Promise<any> {
  try {
    // Generate unique RFQ number
    const rfqNumber = generateRFQNumber();

    // Create RFQ header record
    const rfq = await prisma.rFQ.create({
      data: {
        rfqNumber,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        projectName: payload.projectName,
        projectLocation: payload.projectLocation,
        requestedDate: new Date(payload.requestedDate),
        status: payload.status || 'draft',
        totalAmount: payload.totalAmount,
        notes: payload.notes || '',
        createdBy: payload.createdBy,
      },
    });

    // Create RFQ items if provided
    if (payload.items && payload.items.length > 0) {
      const itemsData = payload.items.map((item) => ({
        rfqId: rfq.id,
        setName: item.setName || 'Set 1',
        requiredDate: new Date(item.requiredDate),
        rentalMonths: item.rentalMonths || 1,
        scaffoldingItemId: item.scaffoldingItemId,
        scaffoldingItemName: item.scaffoldingItemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes || '',
      }));

      await prisma.rFQItem.createMany({
        data: itemsData,
      });
    }

    // Fetch complete RFQ with items
    const completeRFQ = await getRFQById(rfq.id);
    return completeRFQ;
  } catch (error) {
    console.error('[RFQ Service] Error creating RFQ:', error);
    throw new Error(`Failed to create RFQ: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get RFQ by ID with all related items
 * @param rfqId - RFQ ID to retrieve
 * @returns RFQ object with items
 */
export async function getRFQById(rfqId: string): Promise<any> {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        items: true,
      },
    });

    if (!rfq) {
      throw new Error(`RFQ with ID ${rfqId} not found`);
    }

    return rfq;
  } catch (error) {
    console.error('[RFQ Service] Error retrieving RFQ:', error);
    throw error;
  }
}

/**
 * Get all RFQs with optional filtering
 * @param filters - Filter options (status, customerEmail, etc.)
 * @returns Array of RFQ objects
 */
export async function getAllRFQs(filters?: {
  status?: string;
  customerEmail?: string;
  createdBy?: string;
}): Promise<any[]> {
  try {
    const rfqs = await prisma.rFQ.findMany({
      where: filters,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rfqs;
  } catch (error) {
    console.error('[RFQ Service] Error retrieving RFQs:', error);
    throw error;
  }
}

/**
 * Update RFQ status and/or details
 * @param payload - Update data
 * @returns Updated RFQ object
 */
export async function updateRFQ(payload: UpdateRFQPayload): Promise<any> {
  try {
    const updateData: any = {};

    if (payload.status) updateData.status = payload.status;
    if (payload.totalAmount !== undefined) updateData.totalAmount = payload.totalAmount;
    if (payload.notes) updateData.notes = payload.notes;

    // Update RFQ header
    const updatedRFQ = await prisma.rFQ.update({
      where: { id: payload.rfqId },
      data: updateData,
    });

    // Update items if provided
    if (payload.items && payload.items.length > 0) {
      // Delete existing items
      await prisma.rFQItem.deleteMany({
        where: { rfqId: payload.rfqId },
      });

      // Create new items
      const itemsData = payload.items.map((item) => ({
        rfqId: payload.rfqId,
        setName: item.setName || 'Set 1',
        requiredDate: new Date(item.requiredDate),
        rentalMonths: item.rentalMonths || 1,
        scaffoldingItemId: item.scaffoldingItemId,
        scaffoldingItemName: item.scaffoldingItemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes || '',
      }));

      await prisma.rFQItem.createMany({
        data: itemsData,
      });
    }

    // Return updated RFQ with items
    return getRFQById(payload.rfqId);
  } catch (error) {
    console.error('[RFQ Service] Error updating RFQ:', error);
    throw error;
  }
}

/**
 * Delete RFQ and related items
 * @param rfqId - RFQ ID to delete
 * @returns Success confirmation
 */
export async function deleteRFQ(rfqId: string): Promise<boolean> {
  try {
    // Delete associated items first (due to foreign key constraint)
    await prisma.rFQItem.deleteMany({
      where: { rfqId },
    });

    // Delete RFQ
    await prisma.rFQ.delete({
      where: { id: rfqId },
    });

    return true;
  } catch (error) {
    console.error('[RFQ Service] Error deleting RFQ:', error);
    throw error;
  }
}

/**
 * Get RFQ statistics
 * @returns Statistics object
 */
export async function getRFQStats(): Promise<{
  totalRFQs: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
}> {
  try {
    const [total, draft, submitted, approved, rejected] = await Promise.all([
      prisma.rFQ.count(),
      prisma.rFQ.count({ where: { status: 'draft' } }),
      prisma.rFQ.count({ where: { status: 'submitted' } }),
      prisma.rFQ.count({ where: { status: 'approved' } }),
      prisma.rFQ.count({ where: { status: 'rejected' } }),
    ]);

    return {
      totalRFQs: total,
      draftCount: draft,
      submittedCount: submitted,
      approvedCount: approved,
      rejectedCount: rejected,
    };
  } catch (error) {
    console.error('[RFQ Service] Error getting RFQ stats:', error);
    throw error;
  }
}

/**
 * Generate unique RFQ number
 * Format: RFQ-YYYYMMDD-XXXXX (where XXXXX is sequential)
 */
function generateRFQNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `RFQ-${dateStr}-${random}`;
}
