export interface ConditionReport {
  id: string;
  rcfNumber: string;
  deliveryOrderNumber: string;
  customerName: string;
  returnDate: string;
  returnedBy?: string; // Added: Who returned the item
  inspectionDate: string;
  inspectedBy: string;
  status: 'pending' | 'in-progress' | 'completed';
  items: InspectionItem[];
  totalItemsInspected: number;
  totalGood: number; // Added: Total good items
  totalRepair: number; // Added: Total items needing repair
  totalWriteOff: number; // Added: Total write-off items
  totalDamaged: number;
  totalRepairCost: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Link to Return Request (auto-created from return workflow)
  returnRequestId?: string;
  isFromReturn?: boolean; // Convenience flag added by API
  returnRequest?: {
    id: string;
    requestId: string;
    customerName: string;
    agreementNo: string;
    setName: string;
    status: string;
    returnType?: string;
    collectionMethod?: string;
  };
}

export interface InspectionItem {
  id: string;
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;
  quantityGood: number; // Added: Separate good quantity
  quantityRepair: number; // Added: Separate repair quantity
  quantityWriteOff: number; // Added: Separate write-off quantity
  condition: 'good' | 'minor-damage' | 'major-damage' | 'beyond-repair';
  damageDescription?: string;
  images: InspectionImage[];
  repairRequired: boolean;
  estimatedRepairCost: number;
  originalItemPrice?: number; // Added: For calculating repair/write-off costs
  repairSlipId?: string;
  // Item inspection checklist
  inspectionChecklist?: {
    structuralIntegrity: boolean;
    surfaceCondition: boolean;
    connectionsSecure: boolean;
    noCorrosion: boolean;
    safetyCompliance: boolean;
    completeParts: boolean;
  };
}

export interface InspectionImage {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: string;
}

export interface OpenRepairSlip {
  id: string;
  orpNumber: string;
  conditionReportId: string;
  rcfNumber: string;
  items: RepairItem[];
  status: 'open' | 'in-repair' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  startDate?: string;
  completionDate?: string;
  estimatedCost: number; // Auto from RFQ
  actualCost: number; // Manual input - Final cost
  repairNotes?: string;
  invoiceNumber?: string;
  damageInvoiceId?: string; // Link to damage invoice
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  inventoryLevel?: 'very-low' | 'low' | 'normal' | 'high'; // Added for priority calculation
}

export interface RepairItem {
  id: string;
  inspectionItemId: string;
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;
  quantityRepaired: number; // Track how much has been repaired
  quantityRemaining: number; // Track remaining to be repaired
  damageType: 'bent' | 'cracked' | 'corroded' | 'missing-parts' | 'welding-required' | 'other';
  damageDescription: string;
  repairActions: string[];
  repairDescription?: string; // Only required for "other" repair action
  repairStatus: 'pending' | 'in-progress' | 'completed';
  costPerUnit: number;
  totalCost: number;
  estimatedCostFromRFQ?: number; // Added: Auto from RFQ
  finalCost?: number; // Added: Manual input
  beforeImages: string[];
  afterImages: string[];
  completedDate?: string;
}

export interface DamageInvoice {
  id: string;
  invoiceNumber: string;
  orpNumber: string;
  repairSlipId: string;
  invoiceDate: string;
  vendor?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  notes?: string;
  createdAt: string;
  createdFrom: 'repair-slip'; // Now only created from repair slip
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InventoryAdjustment {
  id: string;
  adjustmentType: 'damage-detected' | 'repair-completed' | 'scrapped' | 'write-off-pending';
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;
  fromStatus: string;
  toStatus: string;
  referenceId: string; // Could be ORP number, RCF number, etc.
  referenceType: 'condition-report' | 'repair-slip' | 'damage-invoice';
  adjustedBy: string;
  adjustedAt: string;
  notes?: string;
  conditionReportId?: string; // Link to condition report for write-offs
}

export const DAMAGE_TYPES = [
  { value: 'bent', label: 'Bent/Deformed' },
  { value: 'cracked', label: 'Cracked/Broken' },
  { value: 'corroded', label: 'Rust/Corrosion' },
  { value: 'missing-parts', label: 'Missing Parts' },
  { value: 'welding-required', label: 'Welding Required' },
  { value: 'other', label: 'Other Damage' }
];

export const REPAIR_ACTIONS = [
  'Straightening',
  'Welding',
  'Rust Removal',
  'Painting',
  'Part Replacement',
  'Cleaning',
  'Load Testing',
  'Reinforcement',
  'Scrap & Replace',
  'Others'
];

// Helper function to calculate estimated repair cost
export function calculateEstimatedRepairCost(
  originalPrice: number,
  condition: InspectionItem['condition']
): number {
  if (condition === 'good') return 0;
  if (condition === 'beyond-repair') return originalPrice * 1.2; // 120% for write-off
  // For minor-damage and major-damage
  return originalPrice * 0.6; // 60% for repair
}