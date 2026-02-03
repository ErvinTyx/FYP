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

// Repair action entry: one quantity drives cost (UI shows single "Quantity" field)
export interface RepairActionEntry {
  id: string;
  action: string;              // e.g., "Major concrete cleaning", "Repairable bend"
  /** Kept in sync with issueQuantity for backward compatibility; UI uses single Quantity. */
  affectedItems: number;
  /** Single quantity (items or bends) — used for cost: issueQuantity × costPerUnit. */
  issueQuantity: number;
  costPerUnit: number;         // From ScaffoldingDamageRepair (RM per item or per bend)
  totalCost: number;           // issueQuantity × costPerUnit
}

export interface RepairItem {
  id: string;
  inspectionItemId: string;
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;            // Total quantity from condition report
  quantityRepair: number;      // Items for repair
  quantityWriteOff: number;    // Items for write-off (beyond repair)
  quantityRepaired: number;    // Track how much has been repaired
  quantityRemaining: number;   // Track remaining to be repaired
  damageType: 'bent' | 'cracked' | 'corroded' | 'missing-parts' | 'welding-required' | 'other';
  damageDescription: string;
  repairActions: string[];     // Legacy - kept for backward compatibility
  repairActionEntries: RepairActionEntry[]; // New - detailed repair actions with quantities
  repairDescription?: string;
  repairStatus: 'pending' | 'in-progress' | 'completed';
  // Cost fields
  writeOffCostPerUnit: number; // Original price of scaffolding item
  writeOffTotalCost: number;   // quantityWriteOff × writeOffCostPerUnit
  totalRepairCost: number;     // Sum of all repair action costs
  costPerUnit: number;         // Legacy - kept for backward compatibility
  totalCost: number;           // totalRepairCost + writeOffTotalCost
  estimatedCostFromRFQ?: number;
  finalCost?: number;
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

// Scaffolding item category to repair actions mapping
// Based on Schedule of Damaged Equipment - Repairing Charges
export interface ScaffoldingRepairAction {
  action: string;
  costPerUnit: number;
  costType: 'per-item' | 'per-bend' | 'per-unit'; // How the cost is calculated
}

export const SCAFFOLDING_REPAIR_ACTIONS: Record<string, ScaffoldingRepairAction[]> = {
  // Crab Triangle 1.5m, 0.7m
  'CRAB TRIANGLE': [
    { action: 'Wedge key missing/lost/damaged', costPerUnit: 10.50, costType: 'per-item' },
    { action: 'Bar missing/lost/damaged', costPerUnit: 10.50, costType: 'per-item' },
    { action: 'Repairable bend on horizontal/diagonal members', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  // Crab Plan Brace
  'CRAB PLAN BRACE': [
    { action: 'Repairable pipe bend', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  // Crab Brace
  'CRAB BRACE': [
    { action: 'Repairable pipe bend', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  // Crab Ledger, Base Hook, Crab Step Holder, Crab Ladder Beam
  'CRAB LEDGER': [
    { action: 'Wedge key missing/lost/damaged', costPerUnit: 10.50, costType: 'per-item' },
    { action: 'Repairable pipe bend', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
    { action: 'Fastener bolt missing/lost/damaged', costPerUnit: 15.75, costType: 'per-item' },
  ],
  'ARM LOCK': [
    { action: 'Wedge key missing/lost/damaged', costPerUnit: 10.50, costType: 'per-item' },
    { action: 'Repairable pipe bend', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
    { action: 'Fastener bolt missing/lost/damaged', costPerUnit: 15.75, costType: 'per-item' },
  ],
  'BASE HOOK': [
    { action: 'Wedge key missing/lost/damaged', costPerUnit: 10.50, costType: 'per-item' },
    { action: 'Repairable pipe bend', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
    { action: 'Fastener bolt missing/lost/damaged', costPerUnit: 15.75, costType: 'per-item' },
  ],
  'CRAB STEP HOLDER': [
    { action: 'Wedge key missing/lost/damaged', costPerUnit: 10.50, costType: 'per-item' },
    { action: 'Repairable pipe bend', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
    { action: 'Fastener bolt missing/lost/damaged', costPerUnit: 15.75, costType: 'per-item' },
  ],
  'CRAB LADDER BEAM': [
    { action: 'Wedge key missing/lost/damaged', costPerUnit: 10.50, costType: 'per-item' },
    { action: 'Repairable pipe bend', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
    { action: 'Fastener bolt missing/lost/damaged', costPerUnit: 15.75, costType: 'per-item' },
  ],
  // Crab Basic Standard, Crab Standard (various sizes)
  'CRAB BASIC STANDARD': [
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  'CRAB STANDARD': [
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  'CRAB SMALL POST': [
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  'CRAB END POST': [
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  // Crab Jack Base, Crab U-Head
  'CRAB JACK BASE': [
    { action: 'Thread pipe bend/dented/missing/lost', costPerUnit: 21.00, costType: 'per-item' },
    { action: 'Jack handle nut damaged/missing/lost', costPerUnit: 15.75, costType: 'per-item' },
    { action: 'Base plate & u-plate damaged/missing/lost', costPerUnit: 15.75, costType: 'per-item' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  'CRAB U-HEAD': [
    { action: 'Thread pipe bend/dented/missing/lost', costPerUnit: 21.00, costType: 'per-item' },
    { action: 'Jack handle nut damaged/missing/lost', costPerUnit: 15.75, costType: 'per-item' },
    { action: 'Base plate & u-plate damaged/missing/lost', costPerUnit: 15.75, costType: 'per-item' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  'THREAD PIPE': [
    { action: 'Thread pipe bend/dented/missing/lost', costPerUnit: 21.00, costType: 'per-item' },
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
  ],
  // Default for unknown items
  'DEFAULT': [
    { action: 'Major concrete cleaning', costPerUnit: 2.10, costType: 'per-item' },
    { action: 'Repairable bend/dent', costPerUnit: 5.25, costType: 'per-bend' },
    { action: 'Part replacement', costPerUnit: 10.50, costType: 'per-item' },
    { action: 'Other repair', costPerUnit: 0, costType: 'per-item' },
  ],
};

// Helper function to get repair actions for a scaffolding item
export function getRepairActionsForItem(itemName: string): ScaffoldingRepairAction[] {
  const upperName = itemName.toUpperCase();
  
  // Check for exact or partial matches
  for (const key of Object.keys(SCAFFOLDING_REPAIR_ACTIONS)) {
    if (key !== 'DEFAULT' && upperName.includes(key)) {
      return SCAFFOLDING_REPAIR_ACTIONS[key];
    }
  }
  
  return SCAFFOLDING_REPAIR_ACTIONS['DEFAULT'];
}

// Helper function to calculate estimated repair cost (legacy - kept for backward compatibility)
export function calculateEstimatedRepairCost(
  originalPrice: number,
  condition: InspectionItem['condition']
): number {
  if (condition === 'good') return 0;
  if (condition === 'beyond-repair') return originalPrice; // Write-off = original price
  // For minor-damage and major-damage - now calculated based on specific repair actions
  return 0; // Will be calculated from repair action entries
}