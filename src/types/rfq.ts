export interface ScaffoldingItem {
  id: string;
  name: string;
  description: string;
  unit: string;
  basePrice: number;
}

export interface RFQItem {
  id: string;
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  projectLocation: string;
  requestedDate: string;
  requiredDate: string;
  status: 'draft' | 'quoted-for-item' | 'quoted-for-delivery' | 'submitted' | 'approved' | 'rejected' | 'expired';
  items: RFQItem[];
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export interface RFQNotification {
  id: string;
  rfqId: string;
  rfqNumber: string;
  type: 'created' | 'updated' | 'item_added' | 'item_removed' | 'item_modified' | 'status_changed' | 'assigned';
  message: string;
  changes: NotificationChange[];
  createdBy: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationChange {
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

export const SCAFFOLDING_TYPES: ScaffoldingItem[] = [
  {
    id: 'std-frame-1',
    name: 'Standard Frame 1.8m x 1.2m',
    description: 'Heavy-duty steel frame for general construction',
    unit: 'piece',
    basePrice: 85.00
  },
  {
    id: 'std-frame-2',
    name: 'Standard Frame 2.4m x 1.2m',
    description: 'Extended height steel frame',
    unit: 'piece',
    basePrice: 105.00
  },
  {
    id: 'cross-brace',
    name: 'Cross Brace',
    description: 'Diagonal support for frame stability',
    unit: 'piece',
    basePrice: 25.00
  },
  {
    id: 'platform-board',
    name: 'Platform Board 2.4m',
    description: 'Wooden working platform',
    unit: 'piece',
    basePrice: 45.00
  },
  {
    id: 'platform-board-1.8',
    name: 'Platform Board 1.8m',
    description: 'Shorter wooden working platform',
    unit: 'piece',
    basePrice: 35.00
  },
  {
    id: 'base-jack',
    name: 'Base Jack',
    description: 'Adjustable base support',
    unit: 'piece',
    basePrice: 55.00
  },
  {
    id: 'u-head-jack',
    name: 'U-Head Jack',
    description: 'Top support for beams',
    unit: 'piece',
    basePrice: 65.00
  },
  {
    id: 'coupler-right',
    name: 'Right Angle Coupler',
    description: 'Heavy-duty connection coupler',
    unit: 'piece',
    basePrice: 12.00
  },
  {
    id: 'coupler-swivel',
    name: 'Swivel Coupler',
    description: 'Rotating connection coupler',
    unit: 'piece',
    basePrice: 15.00
  },
  {
    id: 'toe-board',
    name: 'Toe Board 2.4m',
    description: 'Safety edge protection',
    unit: 'piece',
    basePrice: 20.00
  },
  {
    id: 'ladder-access',
    name: 'Ladder Access Frame',
    description: 'Built-in ladder for vertical access',
    unit: 'piece',
    basePrice: 95.00
  },
  {
    id: 'stair-tower',
    name: 'Stair Tower Section',
    description: 'Modular stairway access',
    unit: 'set',
    basePrice: 450.00
  },
  {
    id: 'guardrail-post',
    name: 'Guardrail Post',
    description: 'Safety railing support',
    unit: 'piece',
    basePrice: 30.00
  },
  {
    id: 'guardrail-bar',
    name: 'Guardrail Bar 2.4m',
    description: 'Horizontal safety rail',
    unit: 'piece',
    basePrice: 22.00
  },
  {
    id: 'wheel-set',
    name: 'Mobile Wheel Set',
    description: 'Set of 4 lockable wheels',
    unit: 'set',
    basePrice: 180.00
  }
];