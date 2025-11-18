# Warehouse-to-Distributor Order Flow Implementation Guide

This document provides a comprehensive overview of the warehouse-to-distributor order flow implementation in the Muchiri Warehouse Management System.

## Table of Contents

1. [Overview](#overview)
2. [Order Lifecycle](#order-lifecycle)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [User Interfaces](#user-interfaces)
6. [Key Features](#key-features)
7. [Testing Guide](#testing-guide)

---

## Overview

The warehouse-to-distributor flow enables distributors to order products from the warehouse. This is the first stage in the supply chain:

**Supply Chain Flow:**
```
Warehouse → Distributor → Client
```

**Roles Involved:**
- **Distributor**: Places orders from the warehouse, receives fulfilled orders
- **Manager/Owner**: Fulfills distributor orders, manages warehouse inventory

---

## Order Lifecycle

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTOR CREATES ORDER                     │
│  - Selects products from warehouse inventory                    │
│  - Specifies quantities                                         │
│  - Order created with status: PENDING, UNPAID                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MANAGER REVIEWS ORDER                          │
│  - Views order in warehouse orders page                         │
│  - Verifies order details                                       │
│  - Can cancel if needed                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MANAGER FULFILLS ORDER                         │
│  - Clicks "Fulfill Order" button                                │
│  - System validates warehouse has sufficient stock              │
│  - Warehouse inventory reduced                                  │
│  - InventoryTransaction records created (audit trail)           │
│  - Order status: FULFILLED                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DISTRIBUTOR RECEIVES ORDER                       │
│  - Views fulfilled order in distributor orders page             │
│  - Clicks "Receive Order" button                                │
│  - Distributor inventory increased                              │
│  - InventoryTransaction records created (audit trail)           │
│  - Order status: RECEIVED                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Order States

| Status | Description | Who Can Transition | Next States |
|--------|-------------|-------------------|-------------|
| `PENDING` | Order created, awaiting fulfillment | Distributor (creates) | FULFILLED, CANCELLED |
| `FULFILLED` | Order picked and ready for pickup/delivery | Manager (fulfills) | RECEIVED |
| `RECEIVED` | Distributor confirmed receipt | Distributor (receives) | Terminal state |
| `CANCELLED` | Order cancelled before fulfillment | Manager (cancels) | Terminal state |

### Payment Status

| Status | Description | Notes |
|--------|-------------|-------|
| `UNPAID` | Payment not yet processed | Default state for new orders |
| `PAID` | Payment completed | Manual payment tracking (cash, bank transfer) |

---

## Database Schema

### Relevant Models

#### Order Model
```prisma
model Order {
  id              String        @id @default(uuid())
  orderNumber     String        @unique
  orderType       OrderType     // WAREHOUSE_TO_DISTRIBUTOR
  status          OrderStatus   // PENDING, FULFILLED, RECEIVED, CANCELLED
  paymentStatus   PaymentStatus // UNPAID, PAID
  totalAmount     Decimal
  distributorId   String?
  createdAt       DateTime      @default(now())
  fulfilledAt     DateTime?
  receivedAt      DateTime?

  distributor     Distributor?  @relation(fields: [distributorId])
  orderItems      OrderItem[]
}
```

#### OrderItem Model
```prisma
model OrderItem {
  id          String   @id @default(uuid())
  orderId     String
  productId   String
  quantity    Int
  unitPrice   Decimal

  order       Order    @relation(fields: [orderId])
  product     Product  @relation(fields: [productId])
}
```

#### WarehouseInventory Model
```prisma
model WarehouseInventory {
  id              String   @id @default(uuid())
  productId       String
  quantity        Int
  reorderPoint    Int      @default(50)

  product         Product  @relation(fields: [productId])
}
```

#### DistributorInventory Model
```prisma
model DistributorInventory {
  id              String      @id @default(uuid())
  distributorId   String
  productId       String
  quantity        Int

  distributor     Distributor @relation(fields: [distributorId])
  product         Product     @relation(fields: [productId])

  @@unique([distributorId, productId])
}
```

#### InventoryTransaction Model (Audit Trail)
```prisma
model InventoryTransaction {
  id                  String              @id @default(uuid())
  distributorId       String?
  productId           String
  transactionType     TransactionType     // ORDER_FULFILLED, ORDER_RECEIVED
  quantityChange      Int                 // Negative for reduction, positive for increase
  balanceAfter        Int
  referenceOrderId    String?
  performedByUserId   String
  notes               String?
  createdAt           DateTime            @default(now())

  distributor         Distributor?        @relation(fields: [distributorId])
  product             Product             @relation(fields: [productId])
  performedBy         User                @relation(fields: [performedByUserId])
}
```

---

## API Endpoints

### 1. Create Order (Distributor)

**Endpoint:** `POST /api/orders`

**Authentication:** Required (DISTRIBUTOR role)

**Request Body:**
```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 100
    }
  ]
}
```

**Process:**
1. Validates user is a distributor
2. Validates all products exist and are active
3. Validates warehouse has sufficient stock
4. Creates order with orderType = 'WAREHOUSE_TO_DISTRIBUTOR'
5. Generates order number: `WRH-YYYY-####`
6. Sets status to PENDING, paymentStatus to UNPAID

**Response:**
```json
{
  "message": "Order created successfully",
  "order": {
    "id": "uuid",
    "orderNumber": "WRH-2024-0001",
    "status": "PENDING",
    "paymentStatus": "UNPAID",
    "totalAmount": 50000,
    "orderItems": [...]
  }
}
```

**File:** `src/app/api/orders/route.ts`

---

### 2. Fulfill Order (Manager)

**Endpoint:** `POST /api/orders/[id]/fulfill`

**Authentication:** Required (MANAGER or OWNER role)

**Process:**
1. Validates user is manager or owner
2. Fetches order and validates it's WAREHOUSE_TO_DISTRIBUTOR type
3. Validates order status is PENDING or FULFILLED (idempotent)
4. Validates warehouse has sufficient stock for all items
5. **Transaction begins:**
   - Updates order status to FULFILLED
   - Sets fulfilledAt timestamp
   - For each order item:
     - Reduces warehouse inventory
     - Creates InventoryTransaction record with type 'WAREHOUSE_RESTOCKED'
6. **Transaction commits**

**Response:**
```json
{
  "message": "Order fulfilled successfully",
  "order": {
    "id": "uuid",
    "status": "FULFILLED",
    "fulfilledAt": "2024-01-15T10:30:00Z",
    ...
  }
}
```

**Inventory Transaction Created:**
```json
{
  "transactionType": "WAREHOUSE_RESTOCKED",
  "quantityChange": -100,  // Negative because stock reduced
  "balanceAfter": 900,
  "referenceOrderId": "order-uuid",
  "notes": "Fulfilled distributor order WRH-2024-0001"
}
```

**File:** `src/app/api/orders/[id]/fulfill/route.ts`

---

### 3. Receive Order (Distributor)

**Endpoint:** `POST /api/orders/[id]/receive`

**Authentication:** Required (DISTRIBUTOR role)

**Process:**
1. Validates user is a distributor
2. Fetches order and validates it belongs to this distributor
3. Validates order status is FULFILLED (must be fulfilled before receiving)
4. **Transaction begins:**
   - Updates order status to RECEIVED
   - Sets receivedAt timestamp
   - For each order item:
     - Increases distributor inventory (or creates if doesn't exist)
     - Creates InventoryTransaction record with type 'ORDER_RECEIVED'
5. **Transaction commits**

**Response:**
```json
{
  "message": "Order received successfully",
  "order": {
    "id": "uuid",
    "status": "RECEIVED",
    "receivedAt": "2024-01-15T14:30:00Z",
    ...
  }
}
```

**Inventory Transaction Created:**
```json
{
  "distributorId": "distributor-uuid",
  "transactionType": "ORDER_RECEIVED",
  "quantityChange": 100,  // Positive because stock increased
  "balanceAfter": 100,
  "referenceOrderId": "order-uuid",
  "notes": "Received warehouse order WRH-2024-0001"
}
```

**File:** `src/app/api/orders/[id]/receive/route.ts`

---

### 4. Cancel Order (Manager)

**Endpoint:** `POST /api/orders/[id]/cancel`

**Authentication:** Required (MANAGER or OWNER role)

**Process:**
1. Validates user is manager or owner
2. Validates order is in PENDING status (cannot cancel fulfilled orders)
3. Updates order status to CANCELLED

**Response:**
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "id": "uuid",
    "status": "CANCELLED"
  }
}
```

**File:** `src/app/api/orders/[id]/cancel/route.ts`

---

## User Interfaces

### 1. Manager: Warehouse Orders Page

**Route:** `/warehouse-orders`

**File:** `src/app/warehouse-orders/page.tsx`

**Features:**

#### Stats Dashboard
- Total Orders count
- Pending Orders count (yellow)
- Unpaid Orders count (red)
- Fulfilled Orders count (green)

#### Filter Tabs
- All Orders
- Pending Orders
- Fulfilled Orders

#### Orders Table
Displays:
- Order Number (WRH-2024-####)
- Distributor Name & Business
- Status Badge (color-coded)
- Payment Status Badge
- Total Amount (KSh format)
- Number of Items
- Order Date
- Actions:
  - View Details
  - Fulfill Order (if PAID and PENDING)
  - Cancel Order (if PENDING)

#### Order Details Modal
- Order information (status, payment, dates)
- Distributor details
- Complete items list with:
  - Product name & flavor
  - Quantity
  - Unit price
  - Subtotal
- Order total
- Action buttons (Fulfill/Cancel based on status)

**Key Functions:**
```typescript
const handleFulfillOrder = async (orderId: string) => {
  // Confirms with user
  // Calls POST /api/orders/[id]/fulfill
  // Refreshes order list
}

const handleCancelOrder = async (orderId: string) => {
  // Confirms with user
  // Calls POST /api/orders/[id]/cancel
  // Refreshes order list
}
```

---

### 2. Distributor: Orders Page

**Route:** `/distributor-orders`

**File:** `src/app/distributor-orders/page.tsx`

**Features:**

#### Stats Dashboard
- Total Orders count
- Pending Orders count (yellow)
- Fulfilled Orders count (blue)
- Received Orders count (green)

#### Filter Tabs
- All Orders
- Pending Orders
- Fulfilled Orders
- Received Orders

#### Orders Table
Displays:
- Order Number (WRH-2024-####)
- Status Badge (color-coded)
- Payment Status Badge
- Total Amount (KSh format)
- Number of Items
- Order Date
- Actions:
  - View Details
  - Receive Order (if FULFILLED, not yet RECEIVED)

#### Order Details Modal
- Order information (status, payment, order date, fulfilled date, received date)
- Complete items list with:
  - Product name & flavor
  - Quantity
  - Unit price
  - Subtotal
- Order total
- Action button (Mark as Received if applicable)

**Key Functions:**
```typescript
const handleReceiveOrder = async (orderId: string) => {
  // Confirms with user
  // Calls POST /api/orders/[id]/receive
  // Refreshes order list
  // Shows success message about inventory update
}
```

---

### 3. Dashboard Quick Actions

**File:** `src/app/dashboard/page.tsx`

#### Manager Dashboard
Quick Action: "Process Orders" → Links to `/warehouse-orders`
- Icon: ShoppingCart
- Color: Yellow
- Description: "Fulfill distributor orders"

#### Distributor Dashboard
Quick Action: "Warehouse Orders" → Links to `/distributor-orders`
- Icon: ShoppingCart
- Color: Yellow
- Description: "Track orders from warehouse"

---

## Key Features

### 1. Inventory Management

**Automatic Stock Updates:**
- **On Fulfill**: Warehouse inventory automatically reduced
- **On Receive**: Distributor inventory automatically increased

**Stock Validation:**
- Orders can only be fulfilled if warehouse has sufficient stock
- Real-time validation prevents overselling

**Audit Trail:**
- Every inventory change logged in InventoryTransaction table
- Includes: type, quantity change, balance after, reference order, performer, notes
- Full traceability for compliance and debugging

### 2. Order Number Generation

**Format:** `WRH-YYYY-####`

**Example:** `WRH-2024-0001`

**Logic:**
```typescript
const year = new Date().getFullYear();
const lastOrder = await prisma.order.findFirst({
  where: {
    orderNumber: { startsWith: `WRH-${year}-` },
  },
  orderBy: { orderNumber: 'desc' },
});

let orderCount = 1;
if (lastOrder) {
  const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2]);
  orderCount = lastNumber + 1;
}

const orderNumber = `WRH-${year}-${String(orderCount).padStart(4, '0')}`;
```

### 3. Status Workflow Enforcement

**Business Rules:**
- Orders start as PENDING
- Only PENDING orders can be fulfilled
- Only FULFILLED orders can be received
- Only PENDING orders can be cancelled
- RECEIVED and CANCELLED are terminal states

**Validation:**
```typescript
if (order.status === 'RECEIVED') {
  return NextResponse.json(
    { error: 'Order is already received' },
    { status: 400 }
  );
}
```

### 4. Role-Based Access Control

**Distributor Can:**
- Create warehouse orders (POST /api/orders)
- View their own orders (GET /api/orders)
- Receive fulfilled orders (POST /api/orders/[id]/receive)

**Manager/Owner Can:**
- View all warehouse orders
- Fulfill pending orders (POST /api/orders/[id]/fulfill)
- Cancel pending orders (POST /api/orders/[id]/cancel)

**Client Cannot:**
- Access warehouse-to-distributor flow at all
- Separate flow exists for client orders (distributor-to-client)

### 5. Real-Time Updates

All pages include:
- Loading states
- Error handling with user-friendly messages
- Success confirmations
- Automatic list refresh after actions

### 6. Data Integrity

**Transactions Used:**
- All multi-step operations wrapped in Prisma transactions
- Ensures atomicity (all-or-nothing)
- Prevents partial updates if errors occur

**Example:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Update order
  await tx.order.update({ ... });

  // Update inventory
  await tx.warehouseInventory.update({ ... });

  // Create audit log
  await tx.inventoryTransaction.create({ ... });

  // If any step fails, entire transaction rolls back
});
```

---

## Testing Guide

### Manual Testing Checklist

#### As Distributor:

1. **Create Order:**
   - [ ] Login as distributor
   - [ ] Navigate to Products page
   - [ ] View available warehouse products
   - [ ] Create order with multiple items
   - [ ] Verify order number format (WRH-YYYY-####)
   - [ ] Verify order appears in distributor-orders page as PENDING

2. **View Orders:**
   - [ ] Navigate to /distributor-orders
   - [ ] Verify stats are accurate
   - [ ] Test all filter tabs (All/Pending/Fulfilled/Received)
   - [ ] Click "View Details" on an order
   - [ ] Verify all order information is correct

3. **Receive Order:**
   - [ ] Wait for manager to fulfill order
   - [ ] Refresh distributor-orders page
   - [ ] Verify order status changed to FULFILLED
   - [ ] Click "Receive Order"
   - [ ] Confirm the action
   - [ ] Verify success message
   - [ ] Verify order status changed to RECEIVED
   - [ ] Check distributor inventory - verify quantities increased

#### As Manager:

1. **View Orders:**
   - [ ] Login as manager
   - [ ] Navigate to /warehouse-orders
   - [ ] Verify all distributor orders are visible
   - [ ] Verify stats are accurate
   - [ ] Test all filter tabs

2. **Fulfill Order:**
   - [ ] Find a PENDING order
   - [ ] Click "View Details"
   - [ ] Verify all order information
   - [ ] Click "Fulfill Order"
   - [ ] Confirm the action
   - [ ] Verify success message
   - [ ] Verify order status changed to FULFILLED
   - [ ] Check warehouse inventory - verify quantities decreased

3. **Cancel Order:**
   - [ ] Find a PENDING order
   - [ ] Click "Cancel Order"
   - [ ] Confirm the action
   - [ ] Verify order status changed to CANCELLED

#### Error Cases:

1. **Insufficient Stock:**
   - [ ] Create order for quantity greater than warehouse stock
   - [ ] Verify error message
   - [ ] Try to fulfill order with insufficient stock
   - [ ] Verify error message

2. **Invalid State Transitions:**
   - [ ] Try to cancel a FULFILLED order (should fail)
   - [ ] Try to receive a PENDING order (should fail)
   - [ ] Try to fulfill a RECEIVED order (should fail)

3. **Unauthorized Access:**
   - [ ] Try to access /warehouse-orders as distributor (should redirect/error)
   - [ ] Try to access /distributor-orders as manager (should show no data or error)
   - [ ] Try to fulfill order as distributor (API should reject)

#### Data Verification:

1. **Inventory Accuracy:**
   - [ ] Note warehouse inventory before fulfillment
   - [ ] Fulfill order
   - [ ] Verify warehouse inventory decreased by exact order quantity
   - [ ] Note distributor inventory before receiving
   - [ ] Receive order
   - [ ] Verify distributor inventory increased by exact order quantity

2. **Audit Trail:**
   - [ ] Check InventoryTransaction table after fulfillment
   - [ ] Verify WAREHOUSE_RESTOCKED transaction created
   - [ ] Verify quantityChange is negative
   - [ ] Verify balanceAfter is correct
   - [ ] Check InventoryTransaction table after receiving
   - [ ] Verify ORDER_RECEIVED transaction created
   - [ ] Verify quantityChange is positive
   - [ ] Verify balanceAfter is correct

### API Testing (Using Postman or curl)

#### Create Order:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "items": [
      {"productId": "uuid-1", "quantity": 100},
      {"productId": "uuid-2", "quantity": 50}
    ]
  }'
```

#### Fulfill Order:
```bash
curl -X POST http://localhost:3000/api/orders/{order-id}/fulfill \
  -H "Cookie: sb-access-token=..."
```

#### Receive Order:
```bash
curl -X POST http://localhost:3000/api/orders/{order-id}/receive \
  -H "Cookie: sb-access-token=..."
```

#### Cancel Order:
```bash
curl -X POST http://localhost:3000/api/orders/{order-id}/cancel \
  -H "Cookie: sb-access-token=..."
```

---

## Implementation Summary

### Files Created:
- `src/app/warehouse-orders/page.tsx` - Manager order management UI (728 lines)
- `src/app/distributor-orders/page.tsx` - Distributor order receiving UI (700+ lines)

### Files Modified:
- `src/app/api/orders/route.ts` - Added authentication for order creation
- `src/app/api/orders/[id]/fulfill/route.ts` - Added authentication for fulfillment
- `src/app/api/orders/[id]/receive/route.ts` - Fixed orderItems relation
- `src/app/dashboard/page.tsx` - Updated quick action links
- Multiple API files - Fixed import statements (prisma, supabase)

### Bug Fixes:
1. Fixed missing authentication in POST /api/orders
2. Fixed missing authentication in POST /api/orders/[id]/fulfill
3. Fixed incorrect relation name (orderItem → orderItems) in receive endpoint
4. Fixed all Prisma imports (default → named export)
5. Fixed all Supabase imports (createSupabaseClient → createClient)

### Commits:
- `fix: Fix 3 critical bugs blocking warehouse-to-distributor flow`
- `feat: Complete warehouse-to-distributor order flow with UIs`

---

## Future Enhancements

1. **Email Notifications:**
   - Notify distributor when order is fulfilled
   - Notify manager when new order is placed

2. **Payment Integration:**
   - M-Pesa integration for automatic payments
   - Payment receipts and invoices

3. **Delivery Tracking:**
   - Add delivery status tracking
   - Estimated delivery dates
   - GPS tracking integration

4. **Advanced Analytics:**
   - Order fulfillment time metrics
   - Popular products analysis
   - Distributor performance reports

5. **Batch Operations:**
   - Fulfill multiple orders at once
   - Bulk receive orders

6. **Order Modifications:**
   - Edit pending orders before fulfillment
   - Partial fulfillment support

---

## Troubleshooting

### Common Issues:

**1. "Order not found" error**
- Verify order ID is correct
- Check order belongs to the authenticated user's distributor

**2. "Insufficient stock" error**
- Check warehouse inventory levels
- Verify product IDs are correct
- Consider adjusting order quantities

**3. "Invalid order status" error**
- Check current order status
- Ensure following correct workflow (PENDING → FULFILLED → RECEIVED)
- Cannot skip states or go backwards

**4. Build errors with imports**
- Ensure using `{ prisma }` not `prisma` for imports
- Ensure using `createClient` not `createSupabaseClient`
- Run `npm install` to ensure all dependencies installed

**5. Orders not showing in UI**
- Check user role permissions
- Verify orderType is 'WAREHOUSE_TO_DISTRIBUTOR'
- Check browser console for API errors

---

## Support

For issues or questions:
1. Check this documentation first
2. Review API response error messages
3. Check browser console for client-side errors
4. Check server logs for API errors
5. Verify database records in Prisma Studio

---

**Last Updated:** January 2025
**Version:** 1.0
**Author:** Claude Code Implementation
