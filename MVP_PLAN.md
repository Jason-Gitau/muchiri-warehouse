# Warehouse Management System - MVP Plan
## Quick Start Implementation

**Status:** IN PROGRESS
**Started:** November 18, 2025
**Target Completion:** 7-10 days
**Current Phase:** Setup and Documentation

---

## 🎯 MVP Scope (Minimum Viable Product)

### What's Included in MVP:
✅ **Basic Authentication** - Magic Link only (no Google OAuth yet)
✅ **Product Management** - Manager can add/edit/view products
✅ **Inventory Management** - Manager can restock warehouse inventory
✅ **Simple Order Flow** - Distributor can place orders (manual payment tracking, no M-Pesa)
✅ **Basic Dashboards** - Manager and Distributor views
✅ **Order Processing** - Manager can fulfill orders
✅ **Inventory Sync** - Automatic inventory updates

### What's NOT in MVP (Phase 2):
❌ Google OAuth (Magic Link only for now)
❌ M-Pesa Payment Integration (manual payment tracking)
❌ Client Management & Client Orders
❌ Owner Dashboard with Analytics
❌ Email Notifications
❌ Advanced Features (reports, charts, etc.)

---

## 📋 MVP Implementation Checklist

### Phase 1: Foundation Setup ✅ / ⏳ / ❌

#### Milestone 1: Project Initialization
- [ ] Create Next.js 14+ project with TypeScript
- [ ] Install core dependencies (Prisma, Supabase, React Hook Form, Zod)
- [ ] Setup folder structure
- [ ] Create .env.local template
- [ ] Initialize Git and commit

**Files Created:**
- `package.json`
- `tsconfig.json`
- `tailwind.config.ts`
- `src/` folder structure
- `.env.local.example`

**Estimated Time:** 30 minutes
**Status:** ⏳ IN PROGRESS

---

#### Milestone 2: Database Setup
- [ ] Create Supabase project
- [ ] Copy credentials to .env.local
- [ ] Create Prisma schema (simplified for MVP)
- [ ] Run migrations
- [ ] Test connection with Prisma Studio

**Models for MVP:**
- User (id, email, fullName, role)
- Warehouse (id, name, location)
- Product (id, name, flavor, category, sku, unitPrice, isActive)
- WarehouseInventory (id, warehouseId, productId, quantity, reorderLevel)
- DistributorInventory (id, distributorId, productId, quantity)
- Distributor (id, userId, businessName, phoneNumber, isActive)
- Order (id, orderNumber, warehouseId, distributorId, orderType, status, totalAmount, paymentStatus)
- OrderItem (id, orderId, productId, quantity, unitPrice, subtotal)
- InventoryTransaction (id, warehouseId, distributorId, productId, transactionType, quantityChange, balanceAfter, performedByUserId)

**Files Created:**
- `prisma/schema.prisma`
- `src/lib/prisma.ts`

**Estimated Time:** 1 hour
**Status:** ⏳ PENDING

---

#### Milestone 3: Authentication (Magic Link Only)
- [ ] Configure Supabase Auth for Email/Magic Link
- [ ] Create Supabase client files
- [ ] Create login page
- [ ] Create auth callback route
- [ ] Create middleware for route protection
- [ ] Create basic role-based routing

**Files Created:**
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/middleware.ts`

**Estimated Time:** 1.5 hours
**Status:** ⏳ PENDING

---

### Phase 2: Manager Features ⏳

#### Milestone 4: Product Management
- [ ] Create product types and Zod schemas
- [ ] Create API routes (GET, POST, PATCH, DELETE)
- [ ] Create products list page
- [ ] Create add product form
- [ ] Create edit product form
- [ ] Add validation and error handling

**Files Created:**
- `src/types/index.ts`
- `src/app/api/products/route.ts`
- `src/app/api/products/[id]/route.ts`
- `src/app/(manager)/products/page.tsx`
- `src/app/(manager)/products/new/page.tsx`
- `src/app/(manager)/products/[id]/edit/page.tsx`
- `src/app/(manager)/layout.tsx`

**Features:**
- View all products in table
- Add new product with initial stock
- Edit product details
- Soft delete product
- Show low stock indicators
- Search and filter products

**Estimated Time:** 3 hours
**Status:** ⏳ PENDING

---

#### Milestone 5: Inventory Management
- [ ] Create inventory API routes
- [ ] Create inventory list page
- [ ] Create restock modal/form
- [ ] Implement restock logic with transactions
- [ ] Add inventory adjustment feature

**Files Created:**
- `src/app/api/inventory/route.ts`
- `src/app/api/inventory/restock/route.ts`
- `src/app/(manager)/inventory/page.tsx`
- `src/components/inventory/RestockModal.tsx`

**Features:**
- View warehouse inventory
- Restock products
- Adjust inventory with notes
- Show low stock alerts
- Transaction audit trail

**Estimated Time:** 2 hours
**Status:** ⏳ PENDING

---

#### Milestone 6: Order Management (Manager Side)
- [ ] Create order API routes
- [ ] Create orders list page (manager view)
- [ ] Create order detail page
- [ ] Implement order status updates
- [ ] Implement order fulfillment logic

**Files Created:**
- `src/app/api/orders/route.ts`
- `src/app/api/orders/[id]/route.ts`
- `src/app/api/orders/[id]/fulfill/route.ts`
- `src/app/(manager)/orders/page.tsx`
- `src/app/(manager)/orders/[id]/page.tsx`

**Features:**
- View all distributor orders
- Filter by status, date
- View order details
- Mark as Processing
- Fulfill order (reduces warehouse inventory)
- Cancel order

**Estimated Time:** 3 hours
**Status:** ⏳ PENDING

---

### Phase 3: Distributor Features ⏳

#### Milestone 7: Distributor Dashboard
- [ ] Create distributor layout
- [ ] Create dashboard with basic stats
- [ ] Create product browsing page
- [ ] Implement shopping cart (client-side state)
- [ ] Create checkout page (without payment)

**Files Created:**
- `src/app/(distributor)/layout.tsx`
- `src/app/(distributor)/dashboard/page.tsx`
- `src/app/(distributor)/products/page.tsx`
- `src/components/cart/ShoppingCart.tsx`
- `src/app/(distributor)/checkout/page.tsx`
- `src/hooks/useCart.ts`

**Features:**
- Browse warehouse products
- Add to cart
- Update quantities
- View cart total
- Place order (creates order with UNPAID status)

**Estimated Time:** 3 hours
**Status:** ⏳ PENDING

---

#### Milestone 8: Distributor Orders & Inventory
- [ ] Create distributor orders page
- [ ] Implement "Mark as Received" feature
- [ ] Create distributor inventory page
- [ ] Auto-sync inventory on order receipt

**Files Created:**
- `src/app/(distributor)/orders/page.tsx`
- `src/app/(distributor)/inventory/page.tsx`
- `src/app/api/orders/[id]/receive/route.ts`

**Features:**
- View my orders from warehouse
- Track order status
- Mark order as received (updates distributor inventory)
- View distributor inventory

**Estimated Time:** 2 hours
**Status:** ⏳ PENDING

---

### Phase 4: Testing & Documentation ⏳

#### Milestone 9: Testing
- [ ] Test complete order flow (distributor → warehouse)
- [ ] Test inventory synchronization
- [ ] Test all CRUD operations
- [ ] Fix bugs
- [ ] Add loading states
- [ ] Improve error messages

**Estimated Time:** 2 hours
**Status:** ⏳ PENDING

---

#### Milestone 10: Documentation
- [ ] Create detailed README.md
- [ ] Document setup instructions
- [ ] Document environment variables
- [ ] Create development guide
- [ ] Document API endpoints
- [ ] Create handoff document for next developer

**Files Created:**
- `README.md`
- `SETUP_GUIDE.md`
- `API_DOCUMENTATION.md`
- `DEVELOPER_HANDOFF.md`

**Estimated Time:** 1 hour
**Status:** ⏳ PENDING

---

## 🗂️ Project Structure (MVP)

```
muchiri-warehouse/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (manager)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   ├── inventory/
│   │   │   │   └── page.tsx
│   │   │   └── orders/
│   │   │       ├── page.tsx
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   ├── (distributor)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── products/
│   │   │   │   └── page.tsx
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx
│   │   │   ├── orders/
│   │   │   │   └── page.tsx
│   │   │   └── inventory/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── products/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── inventory/
│   │   │   │   ├── route.ts
│   │   │   │   └── restock/
│   │   │   │       └── route.ts
│   │   │   └── orders/
│   │   │       ├── route.ts
│   │   │       └── [id]/
│   │   │           ├── route.ts
│   │   │           ├── fulfill/
│   │   │           │   └── route.ts
│   │   │           └── receive/
│   │   │               └── route.ts
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   └── (shadcn components if needed)
│   │   ├── cart/
│   │   │   └── ShoppingCart.tsx
│   │   ├── inventory/
│   │   │   └── RestockModal.tsx
│   │   └── shared/
│   │       ├── Navbar.tsx
│   │       └── LoadingSpinner.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── hooks/
│       └── useCart.ts
├── prisma/
│   └── schema.prisma
├── public/
├── .env.local
├── .env.local.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── MVP_PLAN.md (this file)
├── IMPLEMENTATION_PLAN.md
├── README.md
├── SETUP_GUIDE.md
├── API_DOCUMENTATION.md
├── DEVELOPER_HANDOFF.md
└── TRD.md
```

---

## 📝 Progress Tracking

### Overall MVP Progress: 0%

| Milestone | Status | Progress | Time Spent | Estimated Time |
|-----------|--------|----------|------------|----------------|
| 1. Project Init | ⏳ In Progress | 0% | 0h | 0.5h |
| 2. Database Setup | ⏳ Pending | 0% | 0h | 1h |
| 3. Authentication | ⏳ Pending | 0% | 0h | 1.5h |
| 4. Product Mgmt | ⏳ Pending | 0% | 0h | 3h |
| 5. Inventory Mgmt | ⏳ Pending | 0% | 0h | 2h |
| 6. Order Mgmt | ⏳ Pending | 0% | 0h | 3h |
| 7. Distributor UI | ⏳ Pending | 0% | 0h | 3h |
| 8. Dist Orders | ⏳ Pending | 0% | 0h | 2h |
| 9. Testing | ⏳ Pending | 0% | 0h | 2h |
| 10. Documentation | ⏳ Pending | 0% | 0h | 1h |
| **TOTAL** | | **0%** | **0h** | **19h** |

---

## 🔧 Environment Variables Required

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🧪 Testing Checklist

### Manual Testing (MVP)
- [ ] User can sign up with magic link
- [ ] User can log in with magic link
- [ ] Manager can add new product
- [ ] Manager can edit product
- [ ] Manager can view inventory
- [ ] Manager can restock inventory
- [ ] Distributor can browse products
- [ ] Distributor can add to cart
- [ ] Distributor can place order
- [ ] Manager can view distributor orders
- [ ] Manager can fulfill order
- [ ] Warehouse inventory reduces on fulfillment
- [ ] Distributor can mark order as received
- [ ] Distributor inventory increases on receipt
- [ ] Inventory transactions are logged

---

## 📚 Key Technical Decisions (MVP)

1. **Authentication:** Magic Link only (simpler than OAuth for MVP)
2. **Payments:** Manual tracking (no M-Pesa integration yet)
3. **User Roles:** Only MANAGER and DISTRIBUTOR (no OWNER or CLIENT yet)
4. **Email:** No automated emails (manual for now)
5. **UI Library:** Plain Tailwind CSS (no shadcn/ui to keep it simple)
6. **State Management:** React Hooks only (useState, useEffect)
7. **Form Validation:** React Hook Form + Zod
8. **Database:** PostgreSQL via Supabase
9. **ORM:** Prisma

---

## 🚀 Getting Started (For Next Developer)

### First Time Setup
1. Clone repository
2. Run `npm install`
3. Create `.env.local` with Supabase credentials
4. Run `npx prisma migrate dev`
5. Run `npm run dev`
6. Visit http://localhost:3000

### Where to Start Coding
- Check this file for current progress
- Look at the "Status: ⏳ IN PROGRESS" milestone
- Follow the checklist for that milestone
- Update this file when milestone is complete

### When You're Done
- Update progress tracking table
- Mark milestone as complete ✅
- Document any issues or changes
- Commit with clear message
- Update DEVELOPER_HANDOFF.md with:
  - What was completed
  - What's next
  - Any blockers
  - Any technical debt

---

## 🎯 Success Criteria (MVP)

**MVP is complete when:**
- [x] All 10 milestones marked as ✅
- [x] Can complete full order flow: Distributor orders → Manager fulfills → Distributor receives
- [x] Inventory syncs correctly
- [x] All core features work without errors
- [x] Documentation is complete
- [x] Ready for Phase 2 (M-Pesa, Clients, Analytics)

---

## 📖 Next Steps After MVP

**Phase 2 Features (in priority order):**
1. M-Pesa Payment Integration
2. Client Management & Client Orders
3. Google OAuth
4. Email Notifications
5. Owner Dashboard with Analytics
6. Advanced Reports
7. Deployment to Vercel

See `IMPLEMENTATION_PLAN.md` for full roadmap.

---

**Last Updated:** November 18, 2025
**Current Developer:** Claude Code
**Next Developer:** (TBD - update when handoff occurs)
