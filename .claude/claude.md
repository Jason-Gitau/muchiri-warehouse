# Muchiri Warehouse Supply Chain Management System

## Project Context

This is a **Next.js 14+ web application** for managing a single warehouse's supply chain operations in Kenya. The system tracks inventory, processes orders with M-Pesa payments, and manages the flow from warehouse → distributors → clients for canned soda products.

**Current Status:** Planning stage - TRD completed, no code implemented yet.

---

## Quick Reference

- **Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), Prisma ORM, M-Pesa Daraja API
- **Main Document:** `/TRD.md` - Complete technical requirements (1,464 lines)
- **Target Market:** Kenya (hence M-Pesa integration)
- **Product Focus:** Canned sodas only

---

## System Architecture

### Four-Role User System

1. **OWNER** - Oversees everything, views analytics (read-only dashboard)
2. **MANAGER** - Manages inventory, processes orders, handles distributors and products
3. **DISTRIBUTOR** - Places orders to warehouse (pays via M-Pesa), manages clients, fulfills client orders
4. **CLIENT** - Browses products, places orders to distributor, tracks deliveries

### Supply Chain Flow

```
Warehouse Inventory
    ↓ (Manager fulfills order)
Distributor Inventory (Paid via M-Pesa)
    ↓ (Distributor fulfills order)
Client Receives Products (Manual payment tracking)
```

### Key Distinctions

- **Warehouse → Distributor:** M-Pesa payment integration, automated via API
- **Distributor → Client:** Manual payment tracking (cash/bank transfer), no M-Pesa
- **Single Warehouse:** Not multi-tenant SaaS (Phase 1)
- **Role Assignment:** Owner assigns Managers, Managers add Distributors, Distributors add Clients

---

## Project Structure (Planned)

```
warehouse-app/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, signup pages
│   │   ├── (owner)/         # Owner dashboard (analytics)
│   │   ├── (manager)/       # Manager: inventory, orders, products, distributors
│   │   ├── (distributor)/   # Distributor: orders, clients, inventory
│   │   ├── (client)/        # Client: products, cart, orders
│   │   └── api/             # API routes (orders, payments, mpesa, inventory)
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── orders/          # Order components
│   │   └── shared/          # Reusable components
│   ├── lib/
│   │   ├── supabase/        # Supabase client, auth helpers
│   │   ├── mpesa/           # M-Pesa API integration
│   │   ├── email/           # Email service (Resend/SendGrid)
│   │   └── utils/           # Utility functions
│   ├── types/               # TypeScript types, Zod schemas
│   └── hooks/               # Custom React hooks
├── prisma/
│   └── schema.prisma        # Database schema
├── public/                  # Static assets
├── .env.local               # Environment variables (DO NOT COMMIT)
└── package.json
```

---

## Core Features by Role

### Owner Dashboard
- Real-time analytics (revenue, orders, distributors, clients)
- Revenue trend charts (12 months)
- Top-selling products
- Distributor performance metrics
- Inventory turnover analysis
- Activity feed

### Manager Dashboard
- **Orders:** View, process, fulfill, cancel distributor orders
- **Inventory:** Restock products, adjust quantities, low stock alerts
- **Products:** CRUD operations (add, edit, deactivate products)
- **Distributors:** Add, remove, view details, bulk reassign clients
- **Payments:** Verify M-Pesa transactions, manual payment marking

### Distributor Dashboard
- **Place Orders:** Browse warehouse inventory, add to cart, pay via M-Pesa STK Push
- **My Orders:** Track warehouse orders, mark as received (auto-updates inventory)
- **My Inventory:** View stock levels, auto-synced on order receipt and fulfillment
- **Clients:** Add, remove, view client details
- **Client Orders:** Process client orders, manually mark payments, fulfill orders

### Client Dashboard
- **Product Catalog:** Browse products from assigned distributor
- **Shopping Cart:** Add items, update quantities, checkout
- **Order Tracking:** View order status (pending, processing, fulfilled)
- **Order History:** View past orders

---

## Critical Implementation Details

### Authentication (Supabase Auth)
- **Methods:** Google OAuth + Magic Link (passwordless)
- **Flow:** Sign up → Select role → Role-based redirect
- **Security:** Row-Level Security (RLS) policies, JWT tokens, middleware route protection

### M-Pesa Payment Flow
1. **Distributor checks out** → API calls `/api/mpesa/stk-push`
2. **STK Push sent** to distributor's phone (format: 254XXXXXXXXX)
3. **User enters M-Pesa PIN** on phone
4. **M-Pesa callback** → `/api/mpesa/callback` (updates payment status)
5. **Order status updated** → Payment confirmed → Email sent

**Critical:** Only used for Warehouse → Distributor transactions. Client payments are manual (tracked by distributor).

### Inventory Synchronization
- **Restock (Manager):** +warehouse inventory, creates RESTOCK transaction
- **Order Fulfilled (Manager):** -warehouse inventory, creates ORDER_FULFILLED transaction
- **Order Received (Distributor):** +distributor inventory, creates ORDER_RECEIVED transaction
- **Client Order Fulfilled (Distributor):** -distributor inventory, creates ORDER_FULFILLED transaction

All changes create audit trail in `InventoryTransaction` table.

### Email Notifications (Resend or SendGrid)
**Owner/Manager:**
- New order placed, payment confirmed, low stock alerts

**Distributor:**
- Order confirmation, order fulfilled, payment failed

**Client:**
- Order confirmation, order fulfilled, distributor changed

---

## Database Schema Highlights

**Core Tables:**
- `User` - All users (role: OWNER | MANAGER | DISTRIBUTOR | CLIENT)
- `Warehouse` - Single warehouse info
- `Product` - Canned soda products (name, flavor, SKU, price)
- `WarehouseInventory` - Warehouse stock levels
- `DistributorInventory` - Distributor stock levels
- `Distributor` - Distributor business info
- `Client` - Client info (linked to distributor)
- `Order` - Orders (types: WAREHOUSE_TO_DISTRIBUTOR | DISTRIBUTOR_TO_CLIENT)
- `OrderItem` - Line items for orders
- `Payment` - M-Pesa payment records
- `ClientPayment` - Manual payment tracking
- `InventoryTransaction` - Complete audit trail

**Key Relationships:**
- One warehouse, multiple managers
- Managers add/remove distributors
- Distributors have multiple clients
- Orders flow through two levels (warehouse → distributor → client)

See `.claude/database-schema.md` for complete Prisma schema.

---

## Development Guidelines

### Code Style
- **TypeScript:** Strict mode, no `any` types unless absolutely necessary
- **Naming:** camelCase for variables/functions, PascalCase for components/types
- **Components:** Functional components with TypeScript interfaces for props
- **File Structure:** Group by feature, not by type

### Best Practices
1. **Validation:** Use Zod schemas on both client and server
2. **Error Handling:** Try-catch blocks, user-friendly error messages, log errors
3. **Security:** Never expose secrets, validate all inputs, use Supabase RLS policies
4. **Performance:** Use pagination (20 items/page), debounce searches (300ms), optimize images
5. **Accessibility:** WCAG 2.1 Level AA compliance

### Environment Variables Required
```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# M-Pesa
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_BUSINESS_SHORT_CODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
MPESA_ENVIRONMENT=sandbox

# Email
EMAIL_API_KEY=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Implementation Phases (11 Weeks)

**Week 1-2:** Foundation (Next.js setup, Supabase, auth, database schema)
**Week 3-5:** Core features (products, orders, M-Pesa, payment verification)
**Week 6-7:** Distributor & client functionality (inventory, client management)
**Week 8:** Owner dashboard (analytics, reports, charts)
**Week 9:** Email notifications (templates, triggers)
**Week 10:** Testing & refinement (bug fixes, performance)
**Week 11:** Deployment (Vercel, custom domain, production M-Pesa)
**Week 12+:** Post-launch monitoring, user feedback, iterations

See `.claude/implementation-guide.md` for detailed checklist.

---

## When Working on This Project

### Always Reference
1. `/TRD.md` - Complete requirements
2. `.claude/database-schema.md` - Full Prisma schema
3. `.claude/api-reference.md` - API routes structure
4. `.claude/mpesa-integration.md` - M-Pesa implementation details

### Before Making Changes
- Understand which user role the feature is for
- Check if feature affects inventory (need transaction logging)
- Verify if email notification is required
- Ensure proper role-based access control

### Common Pitfalls to Avoid
1. **Don't** use M-Pesa for client payments (only for distributor payments)
2. **Don't** allow cross-role data access (enforce RLS policies)
3. **Don't** forget to update inventory when fulfilling orders
4. **Don't** skip creating inventory transactions (audit trail is critical)
5. **Don't** expose M-Pesa credentials in client-side code
6. **Don't** allow unauthenticated access to API routes

### Testing Checklist
- [ ] Test all four user roles separately
- [ ] Test M-Pesa flow in sandbox mode
- [ ] Verify inventory updates correctly
- [ ] Check email delivery
- [ ] Test role-based route protection
- [ ] Verify payment callback handling
- [ ] Test bulk client reassignment (when distributor removed)

---

## Getting Help

**For detailed information:**
- Database models → `.claude/database-schema.md`
- API endpoints → `.claude/api-reference.md`
- M-Pesa integration → `.claude/mpesa-integration.md`
- Implementation steps → `.claude/implementation-guide.md`
- Complete requirements → `/TRD.md`

**For questions:**
- Check TRD.md first (very comprehensive)
- Search for similar features in the requirements
- Reference technology stack docs (Next.js, Supabase, Prisma)

---

## Success Criteria

**Technical:**
- Page load < 2s
- API response < 500ms (95th percentile)
- M-Pesa payment success rate > 95%
- Uptime 99.9%

**Business:**
- All four roles can complete their workflows
- Inventory syncs correctly across levels
- Payments process successfully
- Orders flow from warehouse → distributor → client
- Analytics provide actionable insights

---

## Project Owner

**Prepared by:** Jason Mbugua
**Date:** November 18, 2025
**Version:** 1.0
**Status:** Ready for Development

---

**Note to Claude:** This project has exceptional documentation. Use the TRD.md as the source of truth for all requirements. When implementing features, always consider the multi-level supply chain flow and ensure proper role-based access control.
