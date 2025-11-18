# Database Schema Reference

Complete Prisma schema for the Warehouse Supply Chain Management System (PostgreSQL via Supabase).

---

## Quick Reference

**Database:** PostgreSQL (via Supabase)
**ORM:** Prisma
**Schema File:** `prisma/schema.prisma`

**Key Relationships:**
- Users have roles (OWNER, MANAGER, DISTRIBUTOR, CLIENT)
- Warehouse → Managers → Distributors → Clients
- Orders flow through two levels (Warehouse → Distributor, Distributor → Client)
- Inventory tracked at two levels (Warehouse, Distributor)
- Payments differ by level (M-Pesa for warehouse, manual for clients)

---

## Complete Prisma Schema

### 1. Users & Authentication

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  fullName      String
  phoneNumber   String?
  role          UserRole
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([email])
  @@index([role])
}

enum UserRole {
  OWNER
  MANAGER
  DISTRIBUTOR
  CLIENT
}
```

**Purpose:** Central user table for all system users.

**Key Fields:**
- `role` - Determines dashboard access and permissions
- `phoneNumber` - Required for M-Pesa payments (distributors)
- `email` - Unique identifier, used for authentication

**Relationships:**
- One user can be Owner, Manager, Distributor, or Client (mutually exclusive)
- Linked to Supabase Auth via email

**Notes:**
- Supabase Auth handles password/OAuth separately
- This table stores additional user metadata
- Role is set during onboarding and cannot be changed

---

### 2. Warehouse & Managers

```prisma
model Warehouse {
  id        String   @id @default(uuid())
  name      String
  location  String
  ownerId   String
  createdAt DateTime @default(now())

  @@index([ownerId])
}

model WarehouseManager {
  id          String   @id @default(uuid())
  warehouseId String
  managerId   String
  assignedAt  DateTime @default(now())
  isActive    Boolean  @default(true)

  @@unique([warehouseId, managerId])
  @@index([warehouseId])
  @@index([managerId])
}
```

**Purpose:** Single warehouse with assigned managers.

**Key Fields:**
- `Warehouse.ownerId` - References User with role OWNER
- `WarehouseManager.managerId` - References User with role MANAGER
- `isActive` - Allows deactivating managers without deletion

**Relationships:**
- One warehouse per deployment (MVP)
- Multiple managers can be assigned to warehouse
- Owner oversees, managers operate

**Notes:**
- MVP: Single warehouse, but schema supports future multi-warehouse
- Managers added by Owner via admin panel

---

### 3. Products (Canned Sodas)

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  flavor      String
  category    String
  sku         String   @unique
  unitPrice   Decimal  @db.Decimal(10, 2)
  imageUrl    String?
  createdAt   DateTime @default(now())
  isActive    Boolean  @default(true)

  @@index([sku])
  @@index([isActive])
  @@index([category])
}
```

**Purpose:** Product catalog (canned sodas).

**Key Fields:**
- `sku` - Stock Keeping Unit, unique identifier (cannot be changed after creation)
- `unitPrice` - Warehouse selling price to distributors (Decimal for precision)
- `flavor` - Soda flavor (e.g., "Orange", "Lemon")
- `category` - Product grouping (e.g., "Carbonated Drinks", "Energy Drinks")
- `isActive` - Soft delete (hide from catalog without losing historical data)

**Relationships:**
- Products are added by Managers
- Referenced in Orders, Inventory, Transactions

**Notes:**
- Price stored in Decimal (10,2) - e.g., 1234567890.12
- Distributors may sell to clients at different prices (not enforced in app)
- `isActive=false` hides product but retains order history

---

### 4. Inventory Management

```prisma
model WarehouseInventory {
  id              String    @id @default(uuid())
  warehouseId     String
  productId       String
  quantity        Int
  reorderLevel    Int       @default(50)
  lastRestockedAt DateTime?
  updatedAt       DateTime  @updatedAt

  @@unique([warehouseId, productId])
  @@index([warehouseId])
  @@index([productId])
}

model DistributorInventory {
  id            String   @id @default(uuid())
  distributorId String
  productId     String
  quantity      Int
  updatedAt     DateTime @updatedAt

  @@unique([distributorId, productId])
  @@index([distributorId])
  @@index([productId])
}
```

**Purpose:** Track stock levels at warehouse and distributor levels.

**Key Fields:**
- `quantity` - Current stock count
- `reorderLevel` - Minimum stock before alert (warehouse only)
- `lastRestockedAt` - Last manual restock by manager
- `updatedAt` - Auto-updated on any change

**Relationships:**
- WarehouseInventory: One record per (warehouse, product) pair
- DistributorInventory: One record per (distributor, product) pair
- Both reference Product table

**Inventory Updates:**
- **Warehouse:**
  - +quantity: Restock (manager manual)
  - -quantity: Order fulfilled to distributor
- **Distributor:**
  - +quantity: Order received from warehouse
  - -quantity: Client order fulfilled

**Notes:**
- `@@unique` constraints prevent duplicate entries
- Low stock alert triggered when `quantity < reorderLevel`
- All changes logged in `InventoryTransaction` table

---

### 5. Distributors & Clients

```prisma
model Distributor {
  id           String   @id @default(uuid())
  userId       String   @unique
  businessName String
  phoneNumber  String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([isActive])
}

model WarehouseDistributor {
  id              String    @id @default(uuid())
  warehouseId     String
  distributorId   String
  addedByManagerId String
  addedAt         DateTime  @default(now())
  removedAt       DateTime?
  isActive        Boolean   @default(true)

  @@unique([warehouseId, distributorId])
  @@index([warehouseId])
  @@index([distributorId])
}

model Client {
  id            String   @id @default(uuid())
  userId        String   @unique
  distributorId String
  businessName  String?
  phoneNumber   String
  location      String
  addedAt       DateTime @default(now())
  isActive      Boolean  @default(true)

  @@index([userId])
  @@index([distributorId])
  @@index([isActive])
}
```

**Purpose:** Manage distributor and client relationships.

**Key Fields:**
- `Distributor.userId` - References User with role DISTRIBUTOR
- `Client.userId` - References User with role CLIENT
- `Client.distributorId` - Assigned distributor (can change if distributor removed)
- `businessName` - Business entity name (optional for clients)
- `isActive` - Soft delete flag

**Relationships:**
- Distributors added by Managers
- Clients added by Distributors
- One Client belongs to one Distributor
- One Distributor can have multiple Clients

**Special Flow - Distributor Removal:**
1. Manager marks distributor `isActive=false`
2. All clients with `distributorId` become orphaned
3. Manager uses bulk reassignment to assign new distributor
4. Client records updated with new `distributorId`
5. Email notifications sent

**Notes:**
- `WarehouseDistributor` is junction table (links warehouse to distributors)
- `addedByManagerId` tracks who added the distributor
- `removedAt` timestamp for audit trail

---

### 6. Orders

```prisma
model Order {
  id                 String        @id @default(uuid())
  orderNumber        String        @unique
  warehouseId        String
  distributorId      String?
  clientId           String?
  placedByUserId     String
  orderType          OrderType
  status             OrderStatus
  totalAmount        Decimal       @db.Decimal(10, 2)
  paymentStatus      PaymentStatus
  paymentMethod      String?
  mpesaTransactionId String?
  notes              String?
  createdAt          DateTime      @default(now())
  fulfilledAt        DateTime?
  updatedAt          DateTime      @updatedAt

  @@index([orderNumber])
  @@index([warehouseId])
  @@index([distributorId])
  @@index([clientId])
  @@index([status])
  @@index([paymentStatus])
  @@index([createdAt])
}

enum OrderType {
  WAREHOUSE_TO_DISTRIBUTOR
  DISTRIBUTOR_TO_CLIENT
}

enum OrderStatus {
  PENDING
  PROCESSING
  FULFILLED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PENDING
  PAID
  FAILED
}

model OrderItem {
  id        String   @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  unitPrice Decimal  @db.Decimal(10, 2)
  subtotal  Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now())

  @@index([orderId])
  @@index([productId])
}
```

**Purpose:** Track all orders across the supply chain.

**Key Fields:**
- `orderNumber` - Human-readable unique ID (e.g., "ORD-2025-001")
- `orderType` - Distinguishes warehouse vs distributor orders
- `distributorId` - Set for WAREHOUSE_TO_DISTRIBUTOR orders
- `clientId` - Set for DISTRIBUTOR_TO_CLIENT orders
- `placedByUserId` - Who created the order
- `status` - Order lifecycle (pending → processing → fulfilled)
- `paymentStatus` - Payment state (separate from order status)
- `totalAmount` - Calculated sum of all order items
- `fulfilledAt` - Timestamp when order completed

**Order Types:**

**WAREHOUSE_TO_DISTRIBUTOR:**
- `distributorId` is set
- `clientId` is null
- Payment via M-Pesa (tracked in Payment table)
- Fulfilled by Manager

**DISTRIBUTOR_TO_CLIENT:**
- `clientId` is set
- `distributorId` is the seller
- Payment tracked manually (in ClientPayment table)
- Fulfilled by Distributor

**Order Status Flow:**
```
PENDING → PROCESSING → FULFILLED
         ↓
      CANCELLED
```

**Payment Status Flow:**
```
UNPAID → PENDING → PAID
         ↓
       FAILED
```

**OrderItem Fields:**
- `quantity` - Number of units ordered
- `unitPrice` - Price per unit at time of order (frozen, not affected by future price changes)
- `subtotal` - quantity × unitPrice

**Notes:**
- `orderNumber` must be unique and sequential
- `mpesaTransactionId` only populated for M-Pesa payments
- `notes` for special instructions or cancellation reasons
- Multiple `OrderItem` records per order

---

### 7. Payments

```prisma
model Payment {
  id                  String        @id @default(uuid())
  orderId             String        @unique
  amount              Decimal       @db.Decimal(10, 2)
  paymentMethod       String
  mpesaPhoneNumber    String?
  mpesaTransactionId  String?
  mpesaReceiptNumber  String?
  status              PaymentStatus
  paidAt              DateTime?
  createdAt           DateTime      @default(now())

  @@index([orderId])
  @@index([status])
  @@index([mpesaTransactionId])
}

model ClientPayment {
  id                 String   @id @default(uuid())
  orderId            String
  clientId           String
  distributorId      String
  amount             Decimal  @db.Decimal(10, 2)
  markedPaidByUserId String
  paymentNotes       String?
  markedPaidAt       DateTime @default(now())

  @@index([orderId])
  @@index([clientId])
  @@index([distributorId])
}
```

**Purpose:** Track payments at both supply chain levels.

**Payment Table (M-Pesa - Warehouse → Distributor):**

**Key Fields:**
- `orderId` - One-to-one with Order (unique constraint)
- `amount` - Payment amount (should match order total)
- `paymentMethod` - "M-PESA" (or other methods in future)
- `mpesaPhoneNumber` - Format: 254XXXXXXXXX
- `mpesaTransactionId` - M-Pesa transaction ID
- `mpesaReceiptNumber` - M-Pesa receipt number (from callback)
- `status` - UNPAID, PENDING, PAID, FAILED
- `paidAt` - Timestamp when payment confirmed

**M-Pesa Flow:**
1. Order created → Payment record created (status: UNPAID)
2. STK Push initiated → Payment updated (status: PENDING)
3. M-Pesa callback received:
   - Success: status = PAID, paidAt = now(), mpesaReceiptNumber populated
   - Failed: status = FAILED

**ClientPayment Table (Manual - Distributor → Client):**

**Key Fields:**
- `orderId` - Can have multiple payments per order (partial payments)
- `clientId` - Who paid
- `distributorId` - Who received payment
- `markedPaidByUserId` - Distributor user who marked it paid
- `paymentNotes` - "Cash", "Bank Transfer", "Cheque #123", etc.
- `markedPaidAt` - When distributor marked it

**Key Difference:**
- `Payment`: Automated via M-Pesa API
- `ClientPayment`: Manual tracking by distributor (payment happens outside app)

**Notes:**
- `Payment.orderId` has unique constraint (one payment per order)
- `ClientPayment` allows multiple records per order (partial payments)
- Both tables use Decimal for amount precision

---

### 8. Inventory Transactions (Audit Trail)

```prisma
model InventoryTransaction {
  id                String          @id @default(uuid())
  warehouseId       String?
  distributorId     String?
  productId         String
  transactionType   TransactionType
  quantityChange    Int
  balanceAfter      Int
  referenceOrderId  String?
  performedByUserId String
  notes             String?
  createdAt         DateTime        @default(now())

  @@index([warehouseId])
  @@index([distributorId])
  @@index([productId])
  @@index([transactionType])
  @@index([createdAt])
}

enum TransactionType {
  RESTOCK
  ORDER_FULFILLED
  ORDER_RECEIVED
  ADJUSTMENT
}
```

**Purpose:** Complete audit trail of all inventory changes.

**Key Fields:**
- `warehouseId` - Set for warehouse inventory changes
- `distributorId` - Set for distributor inventory changes
- `productId` - Which product changed
- `transactionType` - Type of change
- `quantityChange` - Positive (increase) or negative (decrease)
- `balanceAfter` - Inventory quantity after this transaction
- `referenceOrderId` - Order that triggered this transaction (if applicable)
- `performedByUserId` - Who performed the action
- `notes` - Reason for ADJUSTMENT, or additional context

**Transaction Types:**

**RESTOCK (Warehouse only):**
- Manager adds new stock
- `quantityChange` is positive
- `referenceOrderId` is null
- `notes` may contain supplier info

**ORDER_FULFILLED (Both levels):**
- Warehouse: Manager fulfills distributor order
  - `warehouseId` set
  - `quantityChange` is negative
  - `referenceOrderId` is the distributor order
- Distributor: Distributor fulfills client order
  - `distributorId` set
  - `quantityChange` is negative
  - `referenceOrderId` is the client order

**ORDER_RECEIVED (Distributor only):**
- Distributor marks warehouse order as received
- `distributorId` set
- `quantityChange` is positive
- `referenceOrderId` is the warehouse order

**ADJUSTMENT (Both levels):**
- Manual correction (damaged goods, stock discrepancy)
- Can be positive or negative
- `notes` required (explain reason)

**Example Transaction Flow:**

```
1. Manager restocks 100 units of Product A:
   - type: RESTOCK
   - quantityChange: +100
   - balanceAfter: 100
   - warehouseId: warehouse-1
   - performedByUserId: manager-1

2. Manager fulfills distributor order (50 units):
   - type: ORDER_FULFILLED
   - quantityChange: -50
   - balanceAfter: 50
   - warehouseId: warehouse-1
   - referenceOrderId: order-123
   - performedByUserId: manager-1

3. Distributor receives order (50 units):
   - type: ORDER_RECEIVED
   - quantityChange: +50
   - balanceAfter: 50
   - distributorId: distributor-1
   - referenceOrderId: order-123
   - performedByUserId: distributor-1

4. Distributor fulfills client order (20 units):
   - type: ORDER_FULFILLED
   - quantityChange: -20
   - balanceAfter: 30
   - distributorId: distributor-1
   - referenceOrderId: order-456
   - performedByUserId: distributor-1
```

**Notes:**
- Every inventory change MUST create a transaction record
- `balanceAfter` allows point-in-time inventory reconstruction
- Immutable records (never updated or deleted)
- Critical for inventory audits and reconciliation

---

## Relationships Diagram

```
User (role: OWNER)
  └─→ owns Warehouse
       ├─→ has WarehouseManager (role: MANAGER)
       │    └─→ manages WarehouseInventory
       │         └─→ contains Products
       │
       └─→ has WarehouseDistributor
            └─→ links to Distributor (role: DISTRIBUTOR)
                 ├─→ has DistributorInventory
                 │    └─→ contains Products
                 │
                 ├─→ places Order (type: WAREHOUSE_TO_DISTRIBUTOR)
                 │    ├─→ contains OrderItems
                 │    └─→ has Payment (M-Pesa)
                 │
                 └─→ has Clients (role: CLIENT)
                      └─→ places Order (type: DISTRIBUTOR_TO_CLIENT)
                           ├─→ contains OrderItems
                           └─→ has ClientPayment (manual)
```

---

## Database Indexes

**Critical Indexes for Performance:**

```prisma
// Users
@@index([email])      // Login lookup
@@index([role])       // Role-based queries

// Products
@@index([sku])        // Product lookup
@@index([isActive])   // Filter active products
@@index([category])   // Category filtering

// Orders
@@index([orderNumber])      // Order lookup
@@index([warehouseId])      // Manager views
@@index([distributorId])    // Distributor orders
@@index([clientId])         // Client orders
@@index([status])           // Filter by status
@@index([paymentStatus])    // Payment filtering
@@index([createdAt])        // Date range queries

// Inventory
@@index([warehouseId, productId])    // Warehouse stock lookup
@@index([distributorId, productId])  // Distributor stock lookup

// Transactions
@@index([productId])          // Product history
@@index([createdAt])          // Date range
@@index([transactionType])    // Type filtering
```

**Why These Indexes:**
- Speed up dashboard queries (orders by distributor, status)
- Optimize inventory lookups (frequent reads)
- Improve report generation (date range queries)
- Enhance search functionality (SKU, order number)

---

## Supabase Row-Level Security (RLS) Policies

**Recommended RLS Policies:**

### Users Table
```sql
-- Owners see all users
CREATE POLICY owner_all ON users
  FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER'));

-- Managers see their warehouse's distributors/clients
CREATE POLICY manager_view ON users
  FOR SELECT USING (
    auth.uid() IN (SELECT manager_id FROM warehouse_managers WHERE is_active = true)
  );

-- Users see their own record
CREATE POLICY self_view ON users
  FOR SELECT USING (auth.uid() = id);
```

### Orders Table
```sql
-- Owners/Managers see all warehouse orders
CREATE POLICY warehouse_orders ON orders
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('OWNER', 'MANAGER')
    )
  );

-- Distributors see their own orders
CREATE POLICY distributor_orders ON orders
  FOR SELECT USING (
    distributor_id IN (
      SELECT id FROM distributors
      WHERE user_id = auth.uid()
    )
  );

-- Clients see their own orders
CREATE POLICY client_orders ON orders
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients
      WHERE user_id = auth.uid()
    )
  );
```

### Inventory Tables
```sql
-- Warehouse inventory: Managers can read/write
CREATE POLICY manager_warehouse_inventory ON warehouse_inventory
  FOR ALL USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- Distributor inventory: Distributors can read own, managers can read all
CREATE POLICY distributor_inventory_access ON distributor_inventory
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM distributors WHERE id = distributor_id)
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'MANAGER')
  );
```

**Note:** Implement RLS policies based on security requirements. Above are examples.

---

## Data Validation Rules

### Product
- `name`: 1-100 characters
- `flavor`: 1-50 characters
- `sku`: Unique, 1-50 characters, alphanumeric
- `unitPrice`: Positive decimal, max 10 digits

### Order
- `orderNumber`: Unique, format "ORD-YYYY-NNNNN"
- `totalAmount`: Sum of all order items
- `distributorId`: Required for WAREHOUSE_TO_DISTRIBUTOR
- `clientId`: Required for DISTRIBUTOR_TO_CLIENT

### Inventory
- `quantity`: Non-negative integer
- `reorderLevel`: Positive integer, default 50
- No duplicate (warehouseId, productId) or (distributorId, productId)

### Payment
- `amount`: Matches order total
- `mpesaPhoneNumber`: Format 254XXXXXXXXX (9 digits after 254)
- `orderId`: One-to-one with Order (unique constraint)

---

## Migration Commands

### Initial Setup
```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# Apply migration to database
npx prisma db push

# Seed database (optional)
npm run seed
```

### After Schema Changes
```bash
# Create new migration
npx prisma migrate dev --name add_new_field

# Apply to production
npx prisma migrate deploy
```

### Database Utilities
```bash
# Open Prisma Studio (GUI)
npx prisma studio

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Validate schema
npx prisma validate

# Format schema file
npx prisma format
```

---

## Common Queries (Examples)

### Get all products with warehouse inventory
```typescript
const products = await prisma.product.findMany({
  where: { isActive: true },
  include: {
    warehouseInventory: {
      where: { warehouseId: 'warehouse-1' }
    }
  }
});
```

### Get distributor orders with items
```typescript
const orders = await prisma.order.findMany({
  where: {
    distributorId: 'dist-1',
    orderType: 'WAREHOUSE_TO_DISTRIBUTOR'
  },
  include: {
    orderItems: {
      include: {
        product: true
      }
    },
    payment: true
  },
  orderBy: { createdAt: 'desc' }
});
```

### Get low stock products
```typescript
const lowStock = await prisma.warehouseInventory.findMany({
  where: {
    quantity: { lt: prisma.warehouseInventory.fields.reorderLevel }
  },
  include: {
    product: true
  }
});
```

### Create order with items
```typescript
const order = await prisma.order.create({
  data: {
    orderNumber: 'ORD-2025-001',
    warehouseId: 'warehouse-1',
    distributorId: 'dist-1',
    placedByUserId: 'user-1',
    orderType: 'WAREHOUSE_TO_DISTRIBUTOR',
    status: 'PENDING',
    totalAmount: 1500.00,
    paymentStatus: 'UNPAID',
    orderItems: {
      create: [
        {
          productId: 'prod-1',
          quantity: 50,
          unitPrice: 30.00,
          subtotal: 1500.00
        }
      ]
    }
  }
});
```

### Get inventory transaction history
```typescript
const history = await prisma.inventoryTransaction.findMany({
  where: {
    productId: 'prod-1',
    warehouseId: 'warehouse-1'
  },
  orderBy: { createdAt: 'desc' },
  take: 20
});
```

---

## Best Practices

### 1. Use Transactions for Inventory Updates
```typescript
await prisma.$transaction(async (tx) => {
  // Update inventory
  await tx.warehouseInventory.update({
    where: { id: 'inv-1' },
    data: { quantity: { decrement: 50 } }
  });

  // Create transaction record
  await tx.inventoryTransaction.create({
    data: {
      warehouseId: 'warehouse-1',
      productId: 'prod-1',
      transactionType: 'ORDER_FULFILLED',
      quantityChange: -50,
      balanceAfter: 50,
      referenceOrderId: 'order-1',
      performedByUserId: 'manager-1'
    }
  });
});
```

### 2. Never Delete, Use Soft Delete
```typescript
// Bad: Hard delete
await prisma.product.delete({ where: { id: 'prod-1' } });

// Good: Soft delete
await prisma.product.update({
  where: { id: 'prod-1' },
  data: { isActive: false }
});
```

### 3. Always Calculate Order Totals
```typescript
const subtotals = items.map(item => item.quantity * item.unitPrice);
const totalAmount = subtotals.reduce((sum, val) => sum + val, 0);
```

### 4. Validate Before Database Operations
```typescript
// Use Zod schemas
const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
  })).min(1)
});

const validated = orderSchema.parse(orderData);
```

---

## Schema Version

**Version:** 1.0
**Last Updated:** November 18, 2025
**Status:** Ready for Implementation

**References:**
- Main TRD: `/TRD.md` (Section 4.2)
- Prisma Docs: https://www.prisma.io/docs
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
