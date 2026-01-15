import { RFQ, RFQNotification } from '../types/rfq';

// Sample RFQs for demonstration purposes
export const sampleRFQs: RFQ[] = [
  {
    id: 'rfq-sample-001',
    rfqNumber: 'RFQ-20250001',
    customerName: 'Pembinaan ABC Sdn Bhd',
    customerEmail: 'info@pemabc.com.my',
    customerPhone: '+60 12-345 6789',
    projectName: 'High-Rise Condominium Project',
    projectLocation: 'Kuala Lumpur City Centre',
    requestedDate: '2025-01-15',
    requiredDate: '2025-02-01',
    status: 'submitted',
    items: [
      {
        id: 'item-001-1',
        scaffoldingItemId: 'std-frame-2',
        scaffoldingItemName: 'Standard Frame 2.4m x 1.2m',
        quantity: 50,
        unit: 'piece',
        unitPrice: 105.00,
        totalPrice: 5250.00
      },
      {
        id: 'item-001-2',
        scaffoldingItemId: 'cross-brace',
        scaffoldingItemName: 'Cross Brace',
        quantity: 100,
        unit: 'piece',
        unitPrice: 25.00,
        totalPrice: 2500.00
      },
      {
        id: 'item-001-3',
        scaffoldingItemId: 'platform-board',
        scaffoldingItemName: 'Platform Board 2.4m',
        quantity: 75,
        unit: 'piece',
        unitPrice: 45.00,
        totalPrice: 3375.00
      },
      {
        id: 'item-001-4',
        scaffoldingItemId: 'base-jack',
        scaffoldingItemName: 'Base Jack',
        quantity: 50,
        unit: 'piece',
        unitPrice: 55.00,
        totalPrice: 2750.00
      }
    ],
    totalAmount: 13875.00,
    notes: 'Project requires urgent delivery. Please include installation support.',
    createdBy: 'Sales Team',
    createdAt: '2025-01-15T09:30:00Z',
    updatedAt: '2025-01-15T09:30:00Z'
  },
  {
    id: 'rfq-sample-002',
    rfqNumber: 'RFQ-20250002',
    customerName: 'Kontraktor XYZ Enterprise',
    customerEmail: 'xyz@kontraktor.my',
    customerPhone: '+60 16-789 0123',
    projectName: 'Commercial Complex Renovation',
    projectLocation: 'Petaling Jaya',
    requestedDate: '2025-01-16',
    requiredDate: '2025-02-15',
    status: 'draft',
    items: [
      {
        id: 'item-002-1',
        scaffoldingItemId: 'std-frame-1',
        scaffoldingItemName: 'Standard Frame 1.8m x 1.2m',
        quantity: 30,
        unit: 'piece',
        unitPrice: 85.00,
        totalPrice: 2550.00
      },
      {
        id: 'item-002-2',
        scaffoldingItemId: 'stair-tower',
        scaffoldingItemName: 'Stair Tower Section',
        quantity: 2,
        unit: 'set',
        unitPrice: 450.00,
        totalPrice: 900.00
      }
    ],
    totalAmount: 3450.00,
    notes: 'Initial estimate for Phase 1. More items to be added after site visit.',
    createdBy: 'Sales Team',
    createdAt: '2025-01-16T14:20:00Z',
    updatedAt: '2025-01-16T14:20:00Z'
  },
  {
    id: 'rfq-sample-003',
    rfqNumber: 'RFQ-20250003',
    customerName: 'Syarikat Perumahan Mega',
    customerEmail: 'procurement@mega.com.my',
    customerPhone: '+60 19-456 7890',
    projectName: 'Landed Property Development',
    projectLocation: 'Selangor',
    requestedDate: '2025-01-17',
    requiredDate: '2025-03-01',
    status: 'quoted',
    items: [
      {
        id: 'item-003-1',
        scaffoldingItemId: 'std-frame-2',
        scaffoldingItemName: 'Standard Frame 2.4m x 1.2m',
        quantity: 120,
        unit: 'piece',
        unitPrice: 100.00,
        totalPrice: 12000.00
      },
      {
        id: 'item-003-2',
        scaffoldingItemId: 'cross-brace',
        scaffoldingItemName: 'Cross Brace',
        quantity: 240,
        unit: 'piece',
        unitPrice: 22.00,
        totalPrice: 5280.00
      },
      {
        id: 'item-003-3',
        scaffoldingItemId: 'platform-board',
        scaffoldingItemName: 'Platform Board 2.4m',
        quantity: 150,
        unit: 'piece',
        unitPrice: 42.00,
        totalPrice: 6300.00
      },
      {
        id: 'item-003-4',
        scaffoldingItemId: 'guardrail-post',
        scaffoldingItemName: 'Guardrail Post',
        quantity: 80,
        unit: 'piece',
        unitPrice: 30.00,
        totalPrice: 2400.00
      },
      {
        id: 'item-003-5',
        scaffoldingItemId: 'guardrail-bar',
        scaffoldingItemName: 'Guardrail Bar 2.4m',
        quantity: 160,
        unit: 'piece',
        unitPrice: 22.00,
        totalPrice: 3520.00
      }
    ],
    totalAmount: 29500.00,
    notes: 'Bulk order - special pricing applied. Delivery in 2 phases.',
    createdBy: 'Sales Team',
    createdAt: '2025-01-17T10:15:00Z',
    updatedAt: '2025-01-18T11:30:00Z'
  }
];

// Sample notifications for demonstration
export const sampleNotifications: RFQNotification[] = [
  {
    id: 'notif-001',
    rfqId: 'rfq-sample-001',
    rfqNumber: 'RFQ-20250001',
    type: 'created',
    message: 'New RFQ RFQ-20250001 was created',
    changes: [
      {
        field: 'created',
        oldValue: null,
        newValue: 'RFQ-20250001',
        description: 'RFQ created with 4 items'
      }
    ],
    createdBy: 'Sales Team',
    createdAt: '2025-01-15T09:30:00Z',
    read: true
  },
  {
    id: 'notif-002',
    rfqId: 'rfq-sample-003',
    rfqNumber: 'RFQ-20250003',
    type: 'item_added',
    message: 'Items added to RFQ RFQ-20250003',
    changes: [
      {
        field: 'items',
        oldValue: null,
        newValue: {
          id: 'item-003-5',
          scaffoldingItemId: 'guardrail-bar',
          scaffoldingItemName: 'Guardrail Bar 2.4m',
          quantity: 160,
          unit: 'piece',
          unitPrice: 22.00,
          totalPrice: 3520.00
        },
        description: 'Added item: Guardrail Bar 2.4m (Qty: 160)'
      }
    ],
    createdBy: 'Sales Team',
    createdAt: '2025-01-18T11:30:00Z',
    read: false
  },
  {
    id: 'notif-003',
    rfqId: 'rfq-sample-003',
    rfqNumber: 'RFQ-20250003',
    type: 'item_modified',
    message: 'Items modified in RFQ RFQ-20250003',
    changes: [
      {
        field: 'item_price',
        oldValue: 105.00,
        newValue: 100.00,
        description: 'Modified Standard Frame 2.4m x 1.2m: price changed from RM 105.00 to RM 100.00'
      },
      {
        field: 'item_price',
        oldValue: 25.00,
        newValue: 22.00,
        description: 'Modified Cross Brace: price changed from RM 25.00 to RM 22.00'
      }
    ],
    createdBy: 'Sales Team',
    createdAt: '2025-01-18T11:25:00Z',
    read: false
  }
];

// Helper function to load sample data (use in browser console for demo)
export function loadSampleData() {
  localStorage.setItem('rfqs', JSON.stringify(sampleRFQs));
  localStorage.setItem('rfqNotifications', JSON.stringify(sampleNotifications));
  console.log('Sample RFQ data loaded successfully!');
  console.log('Please refresh the page to see the sample data.');
}

// Helper function to clear all data
export function clearAllRFQData() {
  localStorage.removeItem('rfqs');
  localStorage.removeItem('rfqNotifications');
  console.log('All RFQ data cleared!');
  console.log('Please refresh the page.');
}
