# Project Overview: Warehouse Supply Chain Management System

## Executive Summary

A Next.js web application for managing a single warehouse's supply chain operations in Kenya, with focus on canned soda distribution through a three-tier system: Warehouse → Distributors → Clients, featuring M-Pesa payment integration.

---

## Business Model

### The Three-Tier Supply Chain

```
┌─────────────────┐
│    WAREHOUSE    │ ← Owner oversees, Manager operates
└────────┬────────┘
         │ Orders + M-Pesa Payment
         ↓
┌─────────────────┐
│  DISTRIBUTORS   │ ← Place orders, manage clients
└────────┬────────┘
         │ Orders + Manual Payment Tracking
         ↓
┌─────────────────┐
│     CLIENTS     │ ← End customers
└─────────────────┘
```

### User Roles & Responsibilities

#### 1. OWNER (Strategic Oversight)
**Access:** Read-only analytics dashboard

**Capabilities:**
- View real-time business metrics
- Analyze revenue trends (12-month charts)
- Monitor distributor performance
- Track inventory turnover
- Review top-selling products
- Monitor activity feed

**Cannot:** Modify data, process orders, manage inventory

---

#### 2. MANAGER (Operational Management)
**Access:** Full operational control

**Capabilities:**

**Product Management:**
- Add new products (name, flavor, SKU, price, initial stock)
- Edit product details (cannot change SKU after creation)
- Deactivate products (soft delete)

**Inventory Management:**
- Restock warehouse inventory
- Adjust stock (with notes for audit)
- View low stock alerts
- Monitor reorder levels

**Order Processing:**
- View all distributor orders
- Mark orders as "Processing"
- Fulfill orders (triggers inventory deduction)
- Cancel orders with reason
- Verify M-Pesa payments

**Distributor Management:**
- Add distributors (send invitation)
- Remove distributors
- View distributor details & history
- **Bulk reassign clients** when removing distributor

**Payment Verification:**
- Review M-Pesa transaction details
- Manually mark payments (if needed)

---

#### 3. DISTRIBUTOR (Wholesale Buyer & Retailer)
**Access:** Own inventory, clients, and orders

**Capabilities:**

**Purchasing from Warehouse:**
- Browse warehouse inventory
- Add products to cart
- Checkout and pay via M-Pesa STK Push
- Track order status
- Mark received orders (auto-updates inventory)

**Inventory Management:**
- View personal stock levels
- Inventory auto-syncs on:
  - Order receipt from warehouse (+quantity)
  - Client order fulfillment (-quantity)

**Client Management:**
- Add clients (send invitation)
- Remove clients (mark inactive)
- View client order history

**Client Order Processing:**
- View orders placed by clients
- **Manually mark client payments** (cash/bank transfer tracking)
- Fulfill client orders (auto-deducts from distributor inventory)

**Key Distinction:** Distributors are both buyers (from warehouse) and sellers (to clients).

---

#### 4. CLIENT (End Customer)
**Access:** Product catalog and own orders

**Capabilities:**
- Browse products (from assigned distributor's inventory)
- Add to cart, update quantities
- Place orders
- Track order status (pending → processing → fulfilled)
- View order history

**Payment:** Happens outside the app (cash, bank transfer) - distributor tracks manually.

---

## Technical Architecture

### Technology Stack

**Frontend:**
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Tailwind CSS for styling
- shadcn/ui for UI components
- React Hook Form + Zod for validation

**Backend:**
- Next.js API Routes / Server Actions
- PostgreSQL database (via Supabase)
- Prisma ORM
- Supabase Auth (Google OAuth + Magic Link)

**External Services:**
- Supabase (database + authentication)
- M-Pesa Daraja API (Kenya payments)
- Resend or SendGrid (email notifications)
- Vercel (hosting)

---

### Application Flow Diagrams

#### Order Flow: Warehouse → Distributor

```
1. Distributor browses warehouse products
   ↓
2. Adds items to cart
   ↓
3. Checkout → Initiates M-Pesa STK Push
   ↓
4. Distributor enters M-Pesa PIN on phone
   ↓
5. M-Pesa callback confirms payment
   ↓
6. Order created (status: PENDING, payment: PAID)
   ↓
7. Manager marks order as PROCESSING
   ↓
8. Manager fulfills order (warehouse inventory -quantity)
   ↓
9. Distributor marks as RECEIVED (distributor inventory +quantity)
```

#### Order Flow: Distributor → Client

```
1. Client browses distributor's products
   ↓
2. Adds items to cart
   ↓
3. Checkout → Order placed (payment: UNPAID)
   ↓
4. Distributor manually marks payment (cash/bank transfer)
   ↓
5. Distributor fulfills order (distributor inventory -quantity)
   ↓
6. Client receives products
```

#### Inventory Synchronization

```
WAREHOUSE INVENTORY
  ↓ (Restock by Manager)
  +quantity → Create RESTOCK transaction

  ↓ (Order fulfilled by Manager)
  -quantity → Create ORDER_FULFILLED transaction

DISTRIBUTOR INVENTORY
  ↓ (Order received from warehouse)
  +quantity → Create ORDER_RECEIVED transaction

  ↓ (Client order fulfilled)
  -quantity → Create ORDER_FULFILLED transaction
```

---

## Key Features

### 1. M-Pesa Payment Integration

**Scope:** Only for Warehouse → Distributor transactions

**Flow:**
1. Distributor initiates checkout
2. API calls M-Pesa STK Push endpoint
3. Payment prompt appears on distributor's phone
4. Distributor enters M-Pesa PIN
5. M-Pesa sends callback to app
6. Payment status updated (PAID or FAILED)
7. Email confirmation sent

**Security:**
- Credentials stored in environment variables
- HTTPS only
- Callback validation
- Idempotency to prevent duplicates

**Environments:**
- Sandbox (testing)
- Production (live payments)

See `.claude/mpesa-integration.md` for implementation details.

---

### 2. Real-Time Analytics (Owner Dashboard)

**Metrics:**
- Total revenue (current month, last month, YTD)
- Active orders count
- Total distributors & clients
- Warehouse inventory value

**Reports:**
- Revenue trend (12-month line chart)
- Orders fulfilled (monthly/quarterly/yearly)
- Top-selling products (bar chart/table)
- Distributor performance (sortable table)
- Inventory turnover (high/low turnover products)

**Filters:**
- Date range pickers
- Distributor selection
- Category filters

---

### 3. Inventory Management

**Warehouse Level (Manager):**
- Add new products with initial stock
- Restock existing products
- Adjust quantities (with notes)
- View low stock alerts (below reorder level)
- Track last restock date

**Distributor Level (Auto-Sync):**
- View current stock
- Filter by category, low stock
- Auto-updates on order receipt/fulfillment

**Audit Trail:**
- Every inventory change logged in `InventoryTransaction` table
- Fields: product, quantity change, balance after, type, performed by, timestamp
- Transaction types: RESTOCK, ORDER_FULFILLED, ORDER_RECEIVED, ADJUSTMENT

---

### 4. Multi-Level Order Management

**Warehouse Orders (Manager View):**
- List all distributor orders
- Filter by status, payment status, date, distributor
- View order details (items, amounts, payment proof)
- Actions: Process, fulfill, cancel

**Distributor Orders (Distributor View):**
- My orders to warehouse
- My clients' orders to me
- Separate views with different workflows

**Client Orders (Client View):**
- My order history
- Track current orders
- View delivery status

---

### 5. Email Notification System

**Automated Triggers:**

**Owner/Manager:**
- New order placed by distributor
- Payment confirmed (M-Pesa)
- Low stock alert (below reorder level)

**Distributor:**
- Order confirmation (to warehouse)
- Order fulfilled (ready for pickup)
- Payment failed (retry instructions)

**Client:**
- Order confirmation
- Order fulfilled (delivery confirmed)
- Distributor changed (new contact info)

**Email Templates:**
- Professional HTML emails
- Dynamic content (order details, amounts)
- Clear call-to-action buttons
- Brand-consistent styling

---

### 6. Role-Based Access Control (RBAC)

**Implementation Layers:**

**1. Authentication (Supabase Auth):**
- Google OAuth
- Magic Link (passwordless)
- JWT token-based sessions

**2. Route Protection (Middleware):**
- Check user session
- Verify user role
- Redirect unauthorized users

**3. Database Security (Supabase RLS):**
- Row-Level Security policies
- Owners see all warehouse data
- Managers see their warehouse only
- Distributors see their data only
- Clients see their orders only

**4. API Authorization:**
- Verify user role in API routes
- Return 403 for unauthorized access
- Log unauthorized attempts

---

### 7. Client Management & Reassignment

**Adding Clients:**
- Distributor enters client info
- Invitation email sent with magic link
- Client signs up, auto-assigned to distributor

**Removing Distributors:**
- Manager marks distributor inactive
- **Bulk Reassignment Flow:**
  1. Manager removes distributor
  2. System shows list of orphaned clients
  3. Manager selects new distributor from dropdown
  4. All clients reassigned at once
  5. Notification emails sent to clients
  6. Client records updated (new distributorId)

**Why Important:** Ensures business continuity when distributors leave/change.

---

## Data Models Overview

### Core Entities

```typescript
User (id, email, fullName, phoneNumber, role, createdAt)
  ↓ has role
UserRole (OWNER | MANAGER | DISTRIBUTOR | CLIENT)

Warehouse (id, name, location, ownerId)
  ↓ has
WarehouseManager (warehouseId, managerId, assignedAt)

Product (id, name, flavor, category, sku, unitPrice, imageUrl)
  ↓ stocked in
WarehouseInventory (warehouseId, productId, quantity, reorderLevel)
DistributorInventory (distributorId, productId, quantity)

Distributor (id, userId, businessName, phoneNumber, isActive)
  ↓ has
Client (id, userId, distributorId, businessName, location)

Order (id, orderNumber, type, status, totalAmount, paymentStatus)
  ↓ contains
OrderItem (orderId, productId, quantity, unitPrice, subtotal)

Payment (orderId, amount, mpesaTransactionId, status, paidAt)
ClientPayment (orderId, clientId, markedPaidByUserId, paymentNotes)

InventoryTransaction (productId, transactionType, quantityChange, performedByUserId)
```

See `.claude/database-schema.md` for complete Prisma schema.

---

## Security Considerations

### Authentication & Authorization
- Supabase Auth (industry-standard)
- JWT tokens for session management
- Role-based route protection
- Database-level RLS policies

### Data Protection
- HTTPS enforced (Vercel)
- Environment variables for secrets
- Input sanitization (prevent XSS, SQL injection)
- Parameterized queries (Prisma ORM)

### Payment Security
- M-Pesa credentials in env vars (never in code)
- Callback validation (verify source)
- Idempotency checks (prevent duplicate payments)
- Complete transaction logging

### Audit Trail
- All inventory changes logged
- Order status history
- Payment records retained
- User action tracking

---

## Performance Requirements

### Technical Targets
- Page load time: < 2 seconds
- API response time: < 500ms (95th percentile)
- Database query time: < 100ms (average)
- Uptime: 99.9%
- M-Pesa payment success rate: > 95%

### Optimization Strategies
- Database indexing (orders, products, transactions)
- Connection pooling (Supabase)
- Pagination (20 items per page)
- Code splitting (Next.js automatic)
- Image optimization (Next.js Image component)
- API response caching (React Query/SWR)
- Debounced search (300ms delay)

---

## Known Limitations (MVP)

### Assumptions
1. Single warehouse only (not multi-location)
2. Canned sodas only (no perishables)
3. M-Pesa is primary payment method (no cash tracking in app)
4. One user = one role (no role switching)
5. Internet connectivity required for all users

### Out of Scope for Phase 1
- Multi-warehouse support
- Supplier management portal
- Employee/driver management
- Expense tracking
- Accounting integration (QuickBooks, Xero)
- Mobile app (web-only for MVP)
- Delivery GPS tracking
- Returns and refunds handling
- Loyalty programs
- Invoice generation (manual for now)

### Future Enhancements (Phase 2)
- Advanced analytics (ML-based forecasting)
- Mobile apps (React Native)
- Multi-warehouse/multi-tenant SaaS
- Automated reordering
- Delivery management with GPS
- Payment plans for large orders
- Barcode scanning
- Real-time updates (WebSockets)

---

## Development Timeline

### Phase 1: Foundation (Week 1-2)
- Next.js project setup
- Supabase configuration
- Database schema creation
- Authentication implementation

### Phase 2: Core Features (Week 3-5)
- Product management
- Warehouse inventory
- Order flow (warehouse → distributor)
- M-Pesa integration
- Payment verification

### Phase 3: Distributor & Client (Week 6-7)
- Distributor dashboard
- Client management
- Client product catalog
- Client order flow

### Phase 4: Owner Dashboard (Week 8)
- Analytics charts
- Performance reports
- Activity feed

### Phase 5: Notifications (Week 9)
- Email service setup
- Email templates
- Notification triggers

### Phase 6: Testing (Week 10)
- Manual testing all flows
- Bug fixes
- Performance optimization
- Security audit

### Phase 7: Deployment (Week 11)
- Vercel deployment
- Production M-Pesa setup
- Custom domain
- User acceptance testing

### Phase 8: Post-Launch (Week 12+)
- Monitoring
- User feedback
- Iterations

See `.claude/implementation-guide.md` for detailed checklist.

---

## Success Metrics

### Business KPIs
- Orders processed per day
- Average order value
- Inventory turnover rate
- Order fulfillment time (placed → fulfilled)
- Payment processing time
- Number of active distributors/clients
- Revenue growth (month-over-month)

### User Metrics
- Daily active users (by role)
- Feature adoption rate
- Error rate (failed orders, payment failures)
- User satisfaction

### Technical Metrics
- Page load time
- API response time
- Uptime percentage
- M-Pesa payment success rate
- Database query performance

---

## Support & Maintenance

### Support Channels
- Email support
- In-app help center (FAQ)
- Phone support (critical issues only)

### Maintenance Schedule
- **Daily:** Monitor error logs, payment failures
- **Weekly:** Database backups verification, performance review
- **Monthly:** Security updates, dependency updates
- **Quarterly:** Feature releases, major updates

### Issue Response SLA
- Critical (system down): < 1 hour
- High (feature broken): < 4 hours
- Medium (minor bug): < 24 hours
- Low (enhancement): < 1 week

---

## Getting Started (For Developers)

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account
- M-Pesa Daraja API credentials (sandbox for testing)
- Email service API key (Resend/SendGrid)

### Setup Steps
1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env.local` with required variables
4. Setup Supabase project
5. Run Prisma migrations: `npx prisma migrate dev`
6. Seed database (optional): `npm run seed`
7. Start dev server: `npm run dev`

### Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier
- `npm run type-check` - TypeScript type checking
- `npx prisma studio` - Open Prisma Studio (database GUI)

---

## Documentation Map

- **`/TRD.md`** - Complete technical requirements (source of truth)
- **`.claude/claude.md`** - Main project context for Claude
- **`.claude/project-overview.md`** - This file (high-level architecture)
- **`.claude/database-schema.md`** - Complete Prisma schema
- **`.claude/api-reference.md`** - API routes structure
- **`.claude/implementation-guide.md`** - Step-by-step implementation checklist
- **`.claude/mpesa-integration.md`** - M-Pesa payment implementation

---

**Last Updated:** November 18, 2025
**Version:** 1.0
**Status:** Ready for Development
