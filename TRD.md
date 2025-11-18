# Technical Requirements Document (TRD)
## Warehouse Supply Chain Management System

**Version:** 1.0  
**Date:** November 18, 2025  
**Project Type:** Single Warehouse Supply Chain Management Web Application

---

## 1. Executive Summary

A Next.js web application for managing a single warehouse's supply chain operations, tracking inventory, processing orders, and managing the flow from warehouse → distributors → clients. The system handles canned soda products with M-Pesa payment integration.

---

## 2. System Overview

### 2.1 Purpose
Enable a warehouse owner to oversee operations while managers handle day-to-day tasks, distributors place and fulfill orders, and clients track their purchases.

### 2.2 Scope
- Single warehouse deployment (not multi-tenant SaaS)
- Four distinct user roles with specific permissions
- Real-time inventory synchronization
- M-Pesa payment integration for warehouse-to-distributor transactions
- Order tracking across the supply chain
- Analytics and reporting for ownership

### 2.3 Target Users
1. **Owner** - Oversees everything, views analytics
2. **Manager(s)** - Manages inventory, processes orders, handles distributors
3. **Distributors** - Places orders, manages clients, fulfills client orders
4. **Clients** - Browse products, place orders, track deliveries

---

## 3. Technology Stack

### 3.1 Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (optional, for common components)
- **State Management:** React Hooks (useState, useEffect, useContext)
- **Forms:** React Hook Form + Zod validation

### 3.2 Backend
- **API:** Next.js API Routes / Server Actions
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma or Supabase Client
- **Authentication:** Supabase Auth (Google OAuth + Magic Link)

### 3.3 External Services
- **Database & Auth:** Supabase
- **Payments:** M-Pesa Daraja API (Kenya)
- **Email:** Resend or SendGrid
- **Hosting:** Vercel

### 3.4 Development Tools
- **Package Manager:** npm or pnpm
- **Code Quality:** ESLint, Prettier
- **Version Control:** Git

---

## 4. System Architecture

### 4.1 Application Structure
```
warehouse-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (owner)/
│   │   │   └── dashboard/
│   │   ├── (manager)/
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── orders/
│   │   │   ├── distributors/
│   │   │   └── products/
│   │   ├── (distributor)/
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   ├── clients/
│   │   │   └── inventory/
│   │   ├── (client)/
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   └── orders/
│   │   └── api/
│   │       ├── orders/
│   │       ├── payments/
│   │       ├── mpesa/
│   │       └── inventory/
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── dashboard/
│   │   ├── orders/
│   │   └── shared/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── mpesa/
│   │   ├── email/
│   │   └── utils/
│   ├── types/
│   └── hooks/
├── prisma/
│   └── schema.prisma
├── public/
└── .env.local
```

### 4.2 Database Schema (PostgreSQL via Supabase)

#### Users & Authentication
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  fullName      String
  phoneNumber   String?
  role          UserRole
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum UserRole {
  OWNER
  MANAGER
  DISTRIBUTOR
  CLIENT
}
```

#### Warehouse & Managers
```prisma
model Warehouse {
  id        String   @id @default(uuid())
  name      String
  location  String
  ownerId   String
  createdAt DateTime @default(now())
}

model WarehouseManager {
  id          String   @id @default(uuid())
  warehouseId String
  managerId   String
  assignedAt  DateTime @default(now())
  isActive    Boolean  @default(true)
}
```

#### Products (Canned Sodas)
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
}
```

#### Inventory
```prisma
model WarehouseInventory {
  id              String   @id @default(uuid())
  warehouseId     String
  productId       String
  quantity        Int
  reorderLevel    Int      @default(50)
  lastRestockedAt DateTime?
  updatedAt       DateTime @updatedAt
  
  @@unique([warehouseId, productId])
}

model DistributorInventory {
  id            String   @id @default(uuid())
  distributorId String
  productId     String
  quantity      Int
  updatedAt     DateTime @updatedAt
  
  @@unique([distributorId, productId])
}
```

#### Distributors & Clients
```prisma
model Distributor {
  id           String   @id @default(uuid())
  userId       String   @unique
  businessName String
  phoneNumber  String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
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
}
```

#### Orders
```prisma
model Order {
  id              String      @id @default(uuid())
  orderNumber     String      @unique
  warehouseId     String
  distributorId   String?
  clientId        String?
  placedByUserId  String
  orderType       OrderType
  status          OrderStatus
  totalAmount     Decimal     @db.Decimal(10, 2)
  paymentStatus   PaymentStatus
  paymentMethod   String?
  mpesaTransactionId String?
  notes           String?
  createdAt       DateTime    @default(now())
  fulfilledAt     DateTime?
  updatedAt       DateTime    @updatedAt
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
  id        String  @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)
  subtotal  Decimal @db.Decimal(10, 2)
  createdAt DateTime @default(now())
}
```

#### Payments
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
}

model ClientPayment {
  id                String   @id @default(uuid())
  orderId           String
  clientId          String
  distributorId     String
  amount            Decimal  @db.Decimal(10, 2)
  markedPaidByUserId String
  paymentNotes      String?
  markedPaidAt      DateTime @default(now())
}
```

#### Inventory Transactions (Audit Trail)
```prisma
model InventoryTransaction {
  id                String              @id @default(uuid())
  warehouseId       String?
  distributorId     String?
  productId         String
  transactionType   TransactionType
  quantityChange    Int
  balanceAfter      Int
  referenceOrderId  String?
  performedByUserId String
  notes             String?
  createdAt         DateTime            @default(now())
}

enum TransactionType {
  RESTOCK
  ORDER_FULFILLED
  ORDER_RECEIVED
  ADJUSTMENT
}
```

---

## 5. Feature Requirements

### 5.1 Authentication & Authorization

#### 5.1.1 Sign Up / Sign In
- **Methods:** 
  - Google OAuth (Continue with Google)
  - Magic Link (passwordless email authentication)
- **Flow:**
  1. User signs up/signs in via Supabase Auth
  2. First-time users select their role during onboarding
  3. Role determines dashboard access
- **Role Assignment:**
  - Owner: Pre-assigned (first user or manually set)
  - Manager: Assigned by Owner
  - Distributor: Added by Manager
  - Client: Added by Distributor

#### 5.1.2 Role-Based Access Control (RBAC)
- Implement middleware to protect routes based on user role
- Use Supabase RLS policies for database-level security
- Redirect unauthorized users to appropriate pages

### 5.2 Owner Dashboard

#### 5.2.1 Overview Metrics (Read-Only)
- **Real-time Stats:**
  - Total revenue (current month, last month, YTD)
  - Active orders count
  - Total distributors
  - Total clients
  - Current warehouse inventory value
  
#### 5.2.2 Analytics & Reports
1. **Revenue Trend Chart**
   - Line chart showing monthly revenue for past 12 months
   - Breakdown by distributor (optional toggle)

2. **Orders Fulfilled Report**
   - Total orders fulfilled (by month, quarter, year)
   - Average fulfillment time
   - Pending vs. completed orders

3. **Top Selling Flavors**
   - Bar chart or table showing:
     - Product name
     - Flavor
     - Total units sold
     - Revenue generated
   - Filterable by date range

4. **Distributor Performance**
   - Table showing:
     - Distributor name
     - Total orders placed
     - Total revenue generated
     - Average order value
     - Average fulfillment time
   - Sortable columns

5. **Inventory Turnover**
   - Products with highest/lowest turnover rates
   - Stock movement over time (last 30/60/90 days)
   - Low stock alerts (below reorder level)

#### 5.2.3 Activity Feed
- Recent orders (last 20)
- Payment confirmations
- Stock updates
- Distributor/client additions

### 5.3 Manager Dashboard

#### 5.3.1 Orders Management
**View Orders:**
- List all orders placed by distributors
- Filter by:
  - Status (pending, processing, fulfilled, cancelled)
  - Payment status
  - Date range
  - Distributor
- Search by order number

**Order Details:**
- Order number, date placed
- Distributor information
- Items ordered (product, quantity, price, subtotal)
- Total amount
- Payment status and method
- M-Pesa transaction details (if paid)

**Actions:**
- Mark order as "Processing"
- Mark order as "Fulfilled" (triggers inventory deduction)
- Cancel order (with reason)
- View payment proof/receipt

#### 5.3.2 Inventory Management

**View Warehouse Inventory:**
- Table showing all products:
  - Product name, flavor, category
  - Current stock quantity
  - Reorder level
  - Last restocked date
- Low stock indicators (highlighted if below reorder level)
- Search and filter by category/flavor

**Add New Stock (Restock):**
- Select product
- Enter quantity to add
- Optional: Add notes (supplier, batch number, etc.)
- On submit:
  - Create inventory transaction (type: RESTOCK)
  - Update warehouse inventory quantity
  - Send email notification to owner (optional)

**Adjust Inventory:**
- Increase/decrease stock for corrections
- Requires notes/reason
- Creates audit trail

#### 5.3.3 Product Management

**Add New Product:**
- Form fields:
  - Product name
  - Flavor
  - Category (dropdown or input)
  - SKU (auto-generated or manual)
  - Unit price
  - Initial stock quantity
  - Reorder level
  - Image URL (optional)
- On submit:
  - Create product
  - Create initial warehouse inventory entry

**Edit Product:**
- Update name, flavor, category, price, reorder level
- Cannot change SKU once created
- Price changes don't affect existing orders

**Remove/Deactivate Product:**
- Soft delete (set isActive = false)
- Hide from distributor/client views
- Retain historical order data

#### 5.3.4 Distributor Management

**View Distributors:**
- List all distributors
- Show: Business name, phone, email, status (active/inactive)
- Total orders placed, total revenue generated

**Add Distributor:**
- Form: Email, business name, phone number
- Send invitation email with magic link to sign up
- Assign role as DISTRIBUTOR upon signup

**Remove Distributor:**
- Mark as inactive
- Show list of their clients
- **Bulk Assign Clients:**
  - Select new distributor from dropdown (or warehouse)
  - Assign all clients at once
  - Update client records with new distributorId
  - Send notification email to clients about distributor change

**View Distributor Details:**
- Order history
- Current inventory (what they have in stock)
- Clients assigned to them
- Payment history

#### 5.3.5 Payment Verification
- View all payments (pending, completed, failed)
- Filter by distributor, date range
- For M-Pesa payments:
  - See transaction ID, receipt number
  - Phone number used for payment
  - Timestamp
- Manually mark as paid (if needed, with notes)

### 5.4 Distributor Dashboard

#### 5.4.1 Order Management (to Warehouse)

**Place Order to Warehouse:**
- Browse available products (from warehouse inventory)
- Add to cart:
  - Select product, quantity
  - View unit price, subtotal
- Cart summary:
  - Total items, total amount
- Checkout:
  - Review order
  - Initiate M-Pesa payment (STK Push)
  - Enter phone number for payment
- On payment success:
  - Order created with status PENDING
  - Payment record created with status PAID
  - Email confirmation sent

**View My Orders (from Warehouse):**
- List all orders placed to warehouse
- Filter by status, payment status, date
- Order details:
  - Items, quantities, amounts
  - Payment status
  - Fulfillment status

**Mark Order as Received:**
- Once order is fulfilled by manager
- Distributor marks as "Received"
- Triggers:
  - Create inventory transaction (type: ORDER_RECEIVED)
  - Update distributor inventory (add quantities)
  - Email notification to manager

#### 5.4.2 Inventory Management

**View My Inventory:**
- List all products in distributor's stock
- Show: Product name, flavor, current quantity
- Filter by category, low stock
- Search products

**Inventory Auto-Update:**
- When order marked as received from warehouse: +quantity
- When client order fulfilled: -quantity

#### 5.4.3 Client Management

**View My Clients:**
- List all clients assigned to this distributor
- Show: Business name, phone, location, status
- Total orders placed by each client

**Add Client:**
- Form: Email, business name, phone, location
- Send invitation email with magic link
- Assign role as CLIENT upon signup
- Set distributorId to current distributor

**Remove Client:**
- Mark as inactive
- Client can no longer place orders
- Historical orders retained

**View Client Details:**
- Order history
- Payment status (manually tracked)
- Contact information

#### 5.4.4 Orders from Clients

**View Client Orders:**
- List all orders placed by clients
- Filter by client, status, payment status
- Order details:
  - Client name
  - Items ordered
  - Total amount
  - Payment status (marked manually by distributor)

**Mark Client as Paid:**
- For each order, distributor can manually mark:
  - "Paid" or "Unpaid"
  - Add payment notes (cash, bank transfer, etc.)
  - Timestamp automatically recorded
- This is for distributor's own records (payment happens outside app)

**Fulfill Client Order:**
- Mark order as fulfilled
- Triggers:
  - Create inventory transaction (type: ORDER_FULFILLED)
  - Reduce distributor inventory
  - Email notification to client
  - Update order status to FULFILLED

### 5.5 Client Dashboard

#### 5.5.1 Product Catalog

**Browse Products:**
- View all active products (from distributor's available stock)
- Group by category or list view
- Show:
  - Product name, flavor
  - Image (if available)
  - Price (set by distributor, not warehouse price)
  - Availability (in stock / out of stock)
- Filter by category, flavor
- Search by name

#### 5.5.2 Place Order

**Shopping Cart:**
- Add products to cart
- Update quantities
- Remove items
- View subtotal, total

**Checkout:**
- Review order summary
- Add delivery notes (optional)
- Submit order
- Order created with status PENDING, payment UNPAID
- Email confirmation sent to client and distributor

#### 5.5.3 Order Tracking

**View My Orders:**
- List all orders placed
- Show:
  - Order number, date
  - Items, quantities
  - Total amount
  - Status (pending, processing, fulfilled)
  - Delivery notes
- Filter by status, date range

**Order Details:**
- Full order breakdown
- Track status:
  - Pending (order placed, awaiting distributor processing)
  - Processing (distributor preparing order)
  - Fulfilled (order delivered)
- Delivery timeline (if available)

---

## 6. M-Pesa Integration (Daraja API)

### 6.1 Overview
- M-Pesa payments used ONLY for warehouse-to-distributor transactions
- Distributors pay warehouse via M-Pesa STK Push
- Client-to-distributor payments happen outside the app

### 6.2 Daraja API Setup

**Environment Variables (.env.local):**
```
# M-Pesa Daraja API
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=your_business_short_code_here
MPESA_PASSKEY=your_passkey_here
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox # or production
```

**API Endpoints:**
- **Sandbox:** https://sandbox.safaricom.co.ke
- **Production:** https://api.safaricom.co.ke

### 6.3 Payment Flow

**Step 1: Initiate STK Push (Lipa Na M-Pesa Online)**
- When distributor checks out:
  - Call `/api/mpesa/stk-push` API route
  - Parameters:
    - Phone number (format: 254XXXXXXXXX)
    - Amount
    - Order ID (as account reference)
  - Returns: CheckoutRequestID
  - Store CheckoutRequestID in payment record

**Step 2: User Enters M-Pesa PIN**
- STK Push prompt appears on distributor's phone
- User enters M-Pesa PIN to authorize payment

**Step 3: Callback Handling**
- M-Pesa sends callback to `/api/mpesa/callback`
- Callback contains:
  - ResultCode (0 = success, other = failed)
  - MpesaReceiptNumber
  - TransactionDate
  - PhoneNumber
  - Amount
- On success:
  - Update payment record: status = PAID, mpesaReceiptNumber
  - Update order: paymentStatus = PAID
  - Send email confirmation
- On failure:
  - Update payment record: status = FAILED
  - Update order: paymentStatus = FAILED
  - Notify distributor to retry

**Step 4: Query Payment Status (Optional)**
- If callback delayed, implement `/api/mpesa/query` endpoint
- Query transaction status using CheckoutRequestID
- Update records accordingly

### 6.4 Security Considerations
- Store M-Pesa credentials in environment variables (never in code)
- Validate callback authenticity (check source IP, signature if available)
- Use HTTPS for all M-Pesa API calls
- Log all transactions for audit trail
- Implement idempotency to prevent duplicate payments

### 6.5 Error Handling
- Timeout: Show user-friendly message, allow retry
- Insufficient funds: Notify user, suggest alternative
- Invalid phone number: Validate format before API call
- Network errors: Retry logic with exponential backoff
- Callback failures: Query endpoint as fallback

---

## 7. Email Notifications

### 7.1 Email Service Setup
- Use **Resend** (recommended) or **SendGrid**
- Configure sending domain
- Store API key in environment variables:
  ```
  EMAIL_API_KEY=your_email_api_key_here
  EMAIL_FROM=noreply@yourdomain.com
  ```

### 7.2 Email Templates & Triggers

**Owner Notifications:**
1. **New Order Placed** (by distributor)
   - Subject: "New Order #[ORDER_NUMBER] - [DISTRIBUTOR_NAME]"
   - Content: Order summary, amount, items
2. **Payment Confirmed**
   - Subject: "Payment Received - Order #[ORDER_NUMBER]"
   - Content: Payment details, M-Pesa receipt
3. **Low Stock Alert**
   - Subject: "Low Stock Alert - [PRODUCT_NAME]"
   - Content: Current quantity, reorder level
   - Trigger: When stock falls below reorder level

**Manager Notifications:**
- Same as Owner (managers are operational)

**Distributor Notifications:**
1. **Order Confirmation** (to warehouse)
   - Subject: "Order Confirmed - #[ORDER_NUMBER]"
   - Content: Order summary, payment status, next steps
2. **Order Fulfilled** (by manager)
   - Subject: "Order Ready for Pickup - #[ORDER_NUMBER]"
   - Content: Items ready, pickup instructions
3. **Payment Failed**
   - Subject: "Payment Failed - Order #[ORDER_NUMBER]"
   - Content: Error details, retry link
4. **New Client Assigned** (when distributor removed)
   - Subject: "Clients Reassigned"
   - Content: List of clients now under their management

**Client Notifications:**
1. **Order Confirmation**
   - Subject: "Order Received - #[ORDER_NUMBER]"
   - Content: Order summary, items, delivery estimate
2. **Order Fulfilled**
   - Subject: "Order Delivered - #[ORDER_NUMBER]"
   - Content: Delivery confirmation, thank you message
3. **Distributor Changed**
   - Subject: "Your Distributor Has Changed"
   - Content: New distributor contact info

### 7.3 Email Implementation
- Create reusable email templates (React Email or HTML)
- API route: `/api/email/send`
- Queue emails (optional: use Vercel Cron or background jobs)
- Handle failures gracefully (log errors, don't block user flow)

---

## 8. User Interface (UI) Requirements

### 8.1 Design Principles
- Clean, modern, professional
- Mobile-responsive (all views)
- Fast loading times
- Intuitive navigation
- Accessible (WCAG 2.1 Level AA)

### 8.2 Common Components

**Navigation:**
- Sidebar (desktop) or hamburger menu (mobile)
- Role-specific menu items
- User profile dropdown (logout, settings)
- Notification bell (optional)

**Dashboard Layout:**
- Header: Page title, breadcrumbs
- Main content area
- Sidebar (left): Navigation
- Optional: Right sidebar for quick stats

**Tables:**
- Sortable columns
- Pagination (20 items per page default)
- Search/filter bar
- Row actions (view, edit, delete)
- Responsive (stack on mobile)

**Forms:**
- Clear labels, placeholders
- Validation errors (inline)
- Loading states (buttons disable, spinners)
- Success/error messages (toasts or alerts)

**Modals:**
- Confirmation dialogs (delete, cancel actions)
- Forms (add product, add client)
- Order details (quick view)

**Charts:**
- Use Recharts or Chart.js
- Responsive
- Interactive tooltips
- Color-coded (consistent palette)

### 8.3 Tailwind CSS Conventions
- Use utility classes
- Define custom colors in `tailwind.config.js`:
  ```js
  colors: {
    primary: {...},
    secondary: {...},
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  }
  ```
- Consistent spacing (use Tailwind's spacing scale)
- Dark mode support (optional)

### 8.4 Loading & Error States
- Skeleton loaders for initial data fetch
- Spinners for button actions
- Empty states (no orders, no products)
- Error pages (404, 500)
- Network error handling (offline banner)

---

## 9. API Routes & Server Actions

### 9.1 API Structure
```
/api
├── /auth
│   ├── /signup (POST)
│   └── /login (POST)
├── /orders
│   ├── / (GET, POST)
│   ├── /[id] (GET, PATCH, DELETE)
│   └── /[id]/fulfill (POST)
├── /products
│   ├── / (GET, POST)
│   └── /[id] (GET, PATCH, DELETE)
├── /inventory
│   ├── /warehouse (GET, POST)
│   ├── /distributor (GET)
│   └── /restock (POST)
├── /distributors
│   ├── / (GET, POST)
│   ├── /[id] (GET, PATCH, DELETE)
│   └── /[id]/clients (GET)
├── /clients
│   ├── / (GET, POST)
│   ├── /[id] (GET, PATCH, DELETE)
│   └── /bulk-reassign (POST)
├── /payments
│   ├── / (GET)
│   └── /[id] (GET, PATCH)
├── /mpesa
│   ├── /stk-push (POST)
│   ├── /callback (POST)
│   └── /query (POST)
├── /reports
│   ├── /revenue (GET)
│   ├── /inventory-turnover (GET)
│   └── /distributor-performance (GET)
└── /email
    └── /send (POST)
```

### 9.2 Authentication Middleware
- Create middleware to verify user session (Supabase Auth)
- Attach user info to request
- Redirect unauthenticated users to login

### 9.3 Authorization Middleware
- Check user role before allowing access to endpoints
- Example:
  ```typescript
  // Only managers can add products
  if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  ```

### 9.4 Error Handling
- Consistent error response format:
  ```json
  {
    "error": "Error message",
    "code": "ERROR_CODE",
    "details": {}
  }
  ```
- Log errors to console (or external service like Sentry)
- Return user-friendly messages

### 9.5 Rate Limiting (Optional)
- Implement rate limiting for sensitive endpoints (M-Pesa, email)
- Use Vercel Edge Config or Upstash Redis

---

## 10. Data Validation

### 10.1 Client-Side Validation
- Use React Hook Form + Zod schemas
- Validate before API calls
- Show inline error messages

### 10.2 Server-Side Validation
- Validate all inputs in API routes
- Use Zod schemas (shared with client)
- Sanitize inputs to prevent SQL injection, XSS

### 10.3 Example Zod Schemas
```typescript
// Product schema
const productSchema = z.object({
  name: z.string().min(1).max(100),
  flavor: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  sku: z.string().min(1).max(50),
  unitPrice: z.number().positive(),
  reorderLevel: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
});

// Order schema
const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  notes: z.string().max(500).optional(),
});
```

---

## 11. Security Requirements

### 11.1 Authentication
- Use Supabase Auth (secure, industry-standard)
- Passwords (if used): min 8 chars, hashed with bcrypt
- Magic links expire after 1 hour
- Session management: JWT tokens (handled by Supabase)

### 11.2 Authorization
- Row-Level Security (RLS) in Supabase:
  - Owners see all warehouse data
  - Managers see only their warehouse
  - Distributors see only their data
  - Clients see only their orders
- Middleware on API routes to verify user role

### 11.3 Data Protection
- HTTPS only (enforced by Vercel)
- Encrypt sensitive data at rest (M-Pesa credentials)
- Sanitize all user inputs
- Use parameterized queries (Prisma handles this)

### 11.4 API Security
- Validate M-Pesa callback signatures (if available)
- Rate limiting on payment endpoints
- CORS configuration (restrict origins in production)
- Environment variables for secrets

### 11.5 Audit Trail
- Log all critical actions:
  - Inventory changes (who, what, when)
  - Order status updates
  - Payment transactions
  - User role changes
- Store in `inventory_transactions` and audit logs table

---

## 12. Performance Optimization

### 12.1 Database
- Index frequently queried columns:
  - `orders.warehouseId`, `orders.distributorId`, `orders.status`
  - `products.sku`, `products.isActive`
  - `inventory_transactions.createdAt`, `inventory_transactions.productId`
- Use connection pooling (Supabase handles this)
- Implement pagination for large datasets
- Use SELECT only necessary columns (avoid SELECT *)

### 12.2 Frontend
- Code splitting (Next.js automatic)
- Image optimization:
  - Use Next.js `<Image>` component
  - Lazy load images below fold
  - WebP format with fallbacks
- Lazy load heavy components (charts, modals)
- Debounce search inputs (300ms delay)
- Cache API responses (React Query or SWR)

### 12.3 API Routes
- Cache static data (products, categories)
- Use Next.js revalidation for ISR pages
- Minimize database queries (use joins, avoid N+1)
- Implement server-side pagination

### 12.4 Monitoring
- Vercel Analytics for page performance
- Error tracking (optional: Sentry)
- Log slow queries (>1s)

---

## 13. Testing Strategy

### 13.1 Unit Tests
- Test utility functions (lib/)
- Test Zod schemas
- Test calculation functions (order totals, inventory updates)

### 13.2 Integration Tests
- Test API routes:
  - Authentication flows
  - Order creation and fulfillment
  - Inventory updates
  - M-Pesa payment flow (mock API)
- Use testing library: Vitest or Jest

### 13.3 E2E Tests (Optional)
- Use Playwright or Cypress
- Test critical user flows:
  - Distributor places order → Manager fulfills → Inventory updates
  - Client places order → Distributor fulfills
  - Manager adds product → Appears in distributor catalog

### 13.4 Manual Testing Checklist
- Test all user roles on different devices
- Test payment flow end-to-end (sandbox)
- Test error scenarios (network failures, invalid inputs)
- Test email delivery
- Test bulk client reassignment

---

## 14. Deployment & DevOps

### 14.1 Environment Variables
Create `.env.local` file (never commit to Git):
```bash
# Database
DATABASE_URL=your_supabase_postgres_url
DIRECT_URL=your_supabase_direct_url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# M-Pesa Daraja API
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=your_business_short_code_here
MPESA_PASSKEY=your_passkey_here
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox # Change to 'production' when ready

# Email Service (Resend or SendGrid)
EMAIL_API_KEY=your_email_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Change in production
```

### 14.2 Vercel Deployment
1. **Connect Repository:**
   - Link GitHub repo to Vercel
   - Auto-deploy on push to main branch

2. **Environment Variables:**
   - Add all env vars in Vercel dashboard
   - Separate environments: Production, Preview, Development

3. **Build Settings:**
   - Framework preset: Next.js
   - Build command: `npm run build` or `pnpm build`
   - Output directory: `.next`

4. **Domain Setup:**
   - Add custom domain
   - Configure DNS (A/CNAME records)
   - Enable HTTPS (automatic)

### 14.3 Database Migrations
- Use Prisma migrations:
  ```bash
  npx prisma migrate dev --name init
  npx prisma generate
  npx prisma db push # For production
  ```
- Run migrations before deployment
- Backup database before major schema changes

### 14.4 Monitoring & Logging
- Vercel deployment logs
- Supabase database logs
- Application logs (console.log in production goes to Vercel)
- Set up error alerts (Vercel Notifications or Sentry)

### 14.5 Backup Strategy
- Supabase automatic daily backups
- Export data weekly (CSV/JSON)
- Document restore procedures

---

## 15. Future Enhancements (Post-MVP)

### 15.1 Phase 2 Features
1. **Advanced Analytics:**
   - Predictive inventory (ML-based stock forecasting)
   - Customer segmentation
   - Profit margin analysis per product

2. **Mobile App:**
   - React Native app for distributors and clients
   - Push notifications for order updates

3. **Multi-Warehouse Support:**
   - Convert to multi-tenant SaaS
   - Warehouse owner can manage multiple locations

4. **Automated Reordering:**
   - Auto-generate purchase orders when stock hits reorder level
   - Integration with suppliers

5. **Delivery Management:**
   - Assign delivery drivers
   - Real-time GPS tracking
   - Proof of delivery (signatures, photos)

6. **Advanced Payment Options:**
   - Support for bank transfers, credit cards
   - Payment plans for large orders
   - Automated invoicing

7. **Loyalty Program:**
   - Reward points for clients
   - Discounts for bulk orders

8. **Barcode Scanning:**
   - Scan products during stock intake
   - Scan during order fulfillment

### 15.2 Technical Improvements
- Implement Redis caching for frequently accessed data
- GraphQL API (replace REST)
- Real-time updates with WebSockets
- Advanced search (Algolia or Meilisearch)
- Internationalization (i18n) for multiple languages

---

## 16. Development Workflow

### 16.1 Git Workflow
- **Main branch:** Production-ready code
- **Develop branch:** Integration branch
- **Feature branches:** `feature/feature-name`
- **Bugfix branches:** `bugfix/bug-description`

### 16.2 Commit Convention
Use conventional commits:
```
feat: Add M-Pesa payment integration
fix: Resolve inventory sync issue
docs: Update README with setup instructions
refactor: Simplify order fulfillment logic
test: Add unit tests for payment service
```

### 16.3 Pull Request Process
1. Create feature branch from `develop`
2. Implement feature with tests
3. Submit PR with description
4. Code review (if team)
5. Merge to `develop`
6. Deploy to staging (Vercel preview)
7. Test on staging
8. Merge to `main` for production deploy

### 16.4 Code Quality
- Run ESLint before commits: `npm run lint`
- Format with Prettier: `npm run format`
- Type check: `npm run type-check`
- Pre-commit hooks (Husky + lint-staged)

---

## 17. Documentation Requirements

### 17.1 Code Documentation
- Add JSDoc comments to complex functions
- Document API endpoints (OpenAPI/Swagger spec)
- README.md with:
  - Project overview
  - Setup instructions
  - Environment variables list
  - Development commands
  - Deployment guide

### 17.2 User Documentation
- **Owner Manual:** How to read reports, interpret analytics
- **Manager Guide:** Step-by-step for inventory, orders, distributors
- **Distributor Guide:** How to place orders, manage clients, use M-Pesa
- **Client Guide:** How to browse products, place orders, track deliveries

### 17.3 API Documentation
- Document all API routes
- Request/response examples
- Error codes and meanings
- Authentication requirements

---

## 18. Known Limitations & Assumptions

### 18.1 Assumptions
1. Single warehouse operations (not multi-location)
2. Canned sodas only (no perishable goods tracking)
3. M-Pesa is the primary payment method (no cash tracking in app)
4. Distributors set their own selling prices to clients (not enforced in app)
5. One user = one role (users cannot switch roles)
6. Email is primary communication channel
7. Internet connectivity assumed for all users

### 18.2 Limitations
1. No offline mode (requires internet)
2. No real-time GPS tracking (Phase 2)
3. No automated supplier integration (manual restocking)
4. No invoice generation (manual for now)
5. Limited reporting (basic analytics only)
6. No mobile app (web-only for MVP)

### 18.3 Out of Scope for MVP
- Supplier management portal
- Employee/driver management
- Expense tracking
- Accounting integration (QuickBooks, Xero)
- Multi-currency support
- Warehouse space management (shelving, zones)
- Returns and refunds handling
- Loyalty programs

---

## 19. Success Metrics (KPIs)

### 19.1 Technical Metrics
- Page load time: < 2 seconds
- API response time: < 500ms (95th percentile)
- Uptime: 99.9%
- M-Pesa payment success rate: > 95%
- Database query time: < 100ms (average)

### 19.2 Business Metrics
- Orders processed per day
- Average order value
- Inventory turnover rate
- Payment processing time (order to payment confirmed)
- Order fulfillment time (order placed to fulfilled)
- Number of active distributors
- Number of active clients
- Revenue growth (month-over-month)

### 19.3 User Metrics
- Daily active users (by role)
- Time spent in app
- Feature adoption rate (which features are most used)
- Error rate (failed orders, payment failures)
- User satisfaction (feedback/support tickets)

---

## 20. Support & Maintenance

### 20.1 Support Channels
- Email support: support@yourdomain.com
- In-app help center (FAQ)
- Phone support for critical issues (owner/manager)

### 20.2 Maintenance Schedule
- **Daily:** Monitor error logs, payment failures
- **Weekly:** Database backups verification, performance review
- **Monthly:** Security updates, dependency updates, user feedback review
- **Quarterly:** Feature releases, major updates

### 20.3 Issue Tracking
- Use GitHub Issues or Jira
- Priority levels: Critical, High, Medium, Low
- Response time SLA:
  - Critical (payment/system down): < 1 hour
  - High (feature broken): < 4 hours
  - Medium (minor bug): < 24 hours
  - Low (enhancement request): < 1 week

---

## 21. Implementation Checklist

### 21.1 Phase 1: Foundation (Week 1-2)
- [ ] Setup Next.js project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Setup Supabase (database + auth)
- [ ] Create database schema (Prisma)
- [ ] Run migrations
- [ ] Implement authentication (Google OAuth, Magic Link)
- [ ] Setup role-based routing

### 21.2 Phase 2: Core Features (Week 3-5)
- [ ] Product management (Manager: CRUD products)
- [ ] Warehouse inventory management
- [ ] Order flow (Distributor → Warehouse)
- [ ] M-Pesa integration (STK Push + callback)
- [ ] Payment verification
- [ ] Order fulfillment (Manager)
- [ ] Inventory sync (Distributor receives order)

### 21.3 Phase 3: Distributor & Client (Week 6-7)
- [ ] Distributor dashboard
- [ ] Distributor inventory view
- [ ] Client management (Distributor: add/remove clients)
- [ ] Client product catalog
- [ ] Client order placement
- [ ] Client order tracking
- [ ] Distributor fulfills client orders
- [ ] Manual payment tracking (Client payments)

### 21.4 Phase 4: Owner Dashboard (Week 8)
- [ ] Revenue trend chart
- [ ] Orders fulfilled report
- [ ] Top selling flavors
- [ ] Distributor performance table
- [ ] Inventory turnover report
- [ ] Activity feed

### 21.5 Phase 5: Email & Notifications (Week 9)
- [ ] Setup email service (Resend/SendGrid)
- [ ] Create email templates
- [ ] Implement notification triggers
- [ ] Test email delivery

### 21.6 Phase 6: Testing & Refinement (Week 10)
- [ ] Manual testing (all user flows)
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation

### 21.7 Phase 7: Deployment (Week 11)
- [ ] Setup Vercel project
- [ ] Configure environment variables
- [ ] Deploy to production
- [ ] Setup custom domain
- [ ] M-Pesa production credentials
- [ ] User acceptance testing
- [ ] Go-live

### 21.8 Phase 8: Post-Launch (Week 12+)
- [ ] Monitor errors and performance
- [ ] Gather user feedback
- [ ] Iterate on features
- [ ] Plan Phase 2 enhancements

---

## 22. Appendices

### 22.1 Glossary
- **SKU:** Stock Keeping Unit (unique product identifier)
- **STK Push:** SIM Toolkit Push (M-Pesa payment prompt on phone)
- **RLS:** Row-Level Security (database access control)
- **RBAC:** Role-Based Access Control
- **MVP:** Minimum Viable Product
- **KPI:** Key Performance Indicator

### 22.2 References
- **Supabase Docs:** https://supabase.com/docs
- **M-Pesa Daraja API:** https://developer.safaricom.co.ke
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Resend Email:** https://resend.com/docs

### 22.3 Contact Information
- **Project Owner:** [Your Name]
- **Technical Lead:** [Developer Name]
- **Email:** [contact@yourdomain.com]
- **Repository:** [GitHub URL]

---

## 23. Sign-Off

This Technical Requirements Document outlines the complete scope, architecture, and implementation details for the Warehouse Supply Chain Management System. It is intended to be used by developers (including Claude Code) to build the application systematically.

**Prepared by:** Jason Mbugua
**Date:** November 18, 2025  
**Version:** 1.0  
**Status:** Approved for Development

---

**END OF DOCUMENT**
