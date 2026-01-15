# RFQ Management System with Notification Tracking

## Overview
A comprehensive Request for Quotation (RFQ) system with real-time change tracking and notifications. Users can create, edit, and manage RFQs for scaffolding items with full audit trail visibility.

## Key Features

### 1. RFQ Management
- **Create RFQ**: Build new quotation requests with customer and project details
- **Select Scaffolding Items**: Choose from 15+ predefined scaffolding types
- **Quantity & Pricing**: Set quantities and adjust unit prices
- **Automatic Calculations**: Real-time total price calculations
- **Status Tracking**: Draft, Submitted, Quoted, Approved, Rejected, Expired

### 2. Scaffolding Item Types
Pre-configured items include:
- Standard Frames (1.8m, 2.4m)
- Cross Braces
- Platform Boards
- Base & U-Head Jacks
- Couplers (Right Angle, Swivel)
- Toe Boards
- Ladder Access Frames
- Stair Tower Sections
- Guardrails
- Mobile Wheel Sets

### 3. Change Tracking & Notifications
All RFQ modifications are automatically tracked:
- **Item Added**: When new scaffolding items are added
- **Item Removed**: When items are deleted
- **Item Modified**: When quantity, type, or price changes
- **Status Changed**: When RFQ status is updated
- **Field Changes**: Customer info, project details, dates

### 4. Notification Center
Located in the top navigation bar (bell icon):
- **Real-time Updates**: See all changes as they happen
- **Unread Counter**: Badge shows number of unread notifications
- **Detailed View**: Click notifications to see complete change details
- **Change Comparison**: View before/after values for all modifications
- **User Attribution**: See who made each change and when
- **Auto-refresh**: Updates every 5 seconds

### 5. Notification Details Modal
Shows comprehensive change information:
- Change type indicators (Add/Remove/Edit icons)
- Side-by-side comparison of old vs new values
- Color-coded changes (red for removals, green for additions)
- Full item details including quantity and pricing
- Timestamp and user information

## How to Use

### Creating an RFQ
1. Navigate to "RFQ & Quotations" in the sidebar
2. Click "New RFQ" button
3. Fill in customer information (name, email, phone)
4. Enter project details (name, location, dates)
5. Click "Add Item" to add scaffolding items
6. Select scaffolding type from dropdown
7. Enter quantity (unit price auto-populates)
8. Review total amounts
9. Save as Draft or Submit

### Editing an RFQ
1. Find the RFQ in the list
2. Click the Edit icon
3. Modify any details (customer info, items, quantities)
4. Add or remove items as needed
5. Changes are automatically tracked
6. Save or Submit when complete

### Viewing Changes
1. Click the bell icon in the top navigation
2. See list of all notifications
3. Unread notifications are highlighted
4. Click any notification to see detailed changes
5. Review before/after values
6. Mark as read or clear all

### Change Detection
The system automatically detects:
- New items added to RFQ
- Items removed from RFQ
- Quantity changes
- Scaffolding type changes
- Unit price modifications
- Customer information updates
- Project detail changes
- Status transitions

## Data Storage
- RFQs stored in localStorage: `rfqs`
- Notifications stored in localStorage: `rfqNotifications`
- Data persists across sessions
- No backend required for demo

## Components

### RFQ Module
- `/components/rfq/RFQManagement.tsx` - Main listing page
- `/components/rfq/RFQForm.tsx` - Create/edit form
- `/components/rfq/RFQDetails.tsx` - Read-only view

### Notifications
- `/components/notifications/NotificationCenter.tsx` - Bell icon dropdown
- `/components/notifications/NotificationDetails.tsx` - Change details modal

### Types
- `/types/rfq.ts` - TypeScript interfaces and scaffolding catalog

## Integration
The RFQ system is integrated into the main ERP application:
- Accessible via "RFQ & Quotations" in Sales & Orders section
- NotificationCenter in top navigation bar
- Uses brand colors (#F15929, #231F20)
- Malaysian Ringgit (RM) currency
- Role-based access (available to all staff)

## Technical Details
- Built with React + TypeScript
- Uses ShadCN UI components
- LocalStorage for persistence
- Real-time change detection with deep comparison
- Automatic notification generation
- Polling for notification updates (5s interval)

## Future Enhancements
- Backend API integration
- Email notifications
- PDF quotation generation
- Approval workflows
- Customer portal access
- Real-time WebSocket updates
