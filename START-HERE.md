# START HERE - Developer Guide

**Muchiri Warehouse Supply Chain Management System**

👋 Welcome! This guide will help you understand and contribute to this codebase.

**Last Updated:** 2025-11-18 | **Implementation Status:** Planning Phase (0% complete)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x or higher
- **npm** or **pnpm**: Latest version
- **PostgreSQL**: Via Supabase (cloud-hosted)
- **Git**: For version control
- **Safaricom M-Pesa account**: For payment testing (Kenya)

### Installation (Future - Not Yet Implemented)

```bash
# Clone repository
git clone https://github.com/Jason-Gitau/muchiri-warehouse.git
cd muchiri-warehouse

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Open browser
# http://localhost:3000
```

### Environment Variables Needed

Create `.env.local` with:

```bash
# Database (Supabase)
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# M-Pesa (Sandbox for testing)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_BUSINESS_SHORT_CODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
MPESA_ENVIRONMENT=sandbox

# Email (Resend or SendGrid)
EMAIL_API_KEY=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**📖 See:** `.claude/implementation-guide.md` (Day 3-4) for Supabase setup details

---

## 📁 Project Structure

```
muchiri-warehouse/
├── .claude/                    # Claude AI documentation
│   ├── claude.md              # Main context for AI
│   ├── project-overview.md    # Architecture & features
│   ├── database-schema.md     # Complete DB schema
│   ├── api-reference.md       # API endpoint docs
│   ├── implementation-guide.md # 11-week dev plan
│   └── mpesa-integration.md   # M-Pesa payment guide
│
├── src/                        # Source code (TO BE CREATED)
│   ├── app/                   # Next.js 14 App Router
│   │   ├── (auth)/           # Authentication pages
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (owner)/          # Owner dashboard
│   │   ├── (manager)/        # Manager dashboard
│   │   ├── (distributor)/    # Distributor dashboard
│   │   ├── (client)/         # Client dashboard
│   │   ├── api/              # API routes
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── inventory/
│   │   │   ├── mpesa/
│   │   │   └── email/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── dashboard/        # Dashboard widgets
│   │   ├── orders/           # Order components
│   │   └── shared/           # Reusable components
│   │
│   ├── lib/                   # Utility libraries
│   │   ├── supabase/         # Supabase client & auth
│   │   ├── mpesa/            # M-Pesa integration
│   │   ├── email/            # Email service
│   │   ├── prisma.ts         # Prisma client
│   │   └── utils.ts          # Helper functions
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts
│   │
│   └── hooks/                 # Custom React hooks
│       └── useAuth.ts
│
├── prisma/                     # Database
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration files
│
├── public/                     # Static assets
│   └── images/
│
├── TRD.md                      # Technical Requirements Document
├── START-HERE.md               # This file (Developer guide)
├── SYSTEM-OVERVIEW.md          # Non-technical overview
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind CSS config
└── next.config.js              # Next.js config
```

### Key Files & Their Purpose

| File/Directory | Purpose | When to Edit |
|----------------|---------|--------------|
| `TRD.md` | Complete technical requirements | When requirements change |
| `.claude/*.md` | AI documentation & guides | After implementing features |
| `prisma/schema.prisma` | Database models | When adding new data models |
| `src/app/api/*` | Backend API routes | When adding new endpoints |
| `src/app/(role)/*` | Role-specific dashboards | When adding role features |
| `src/components/*` | Reusable UI components | When building UI |
| `src/lib/mpesa/*` | M-Pesa payment logic | When modifying payments |

---

## 🧠 Key Concepts

### 1. Four-Role System

**OWNER** (Strategic Oversight)
- Views analytics dashboard
- Monitors business metrics
- Read-only access

**MANAGER** (Operations)
- Manages products and inventory
- Processes distributor orders
- Adds/removes distributors
- Verifies payments

**DISTRIBUTOR** (Wholesale Buyer)
- Places orders to warehouse (pays via M-Pesa)
- Manages personal inventory
- Adds/manages clients
- Fulfills client orders

**CLIENT** (End Customer)
- Browses distributor's products
- Places orders
- Tracks deliveries

**⚠️ Important:** One user = one role (no role switching in MVP)

### 2. Multi-Level Inventory Flow

```
Warehouse Inventory
    ↓ (Manager fulfills order)
Distributor Inventory (Paid via M-Pesa)
    ↓ (Distributor fulfills order)
Client Receives Products (Manual payment tracking)
```

**Critical:** Inventory must sync correctly at each level!

### 3. Order Lifecycle

**Warehouse → Distributor:**
1. PENDING (Order placed, unpaid)
2. PENDING (M-Pesa payment initiated)
3. PAID (M-Pesa callback received)
4. PROCESSING (Manager preparing)
5. FULFILLED (Manager marks done, inventory deducted)
6. RECEIVED (Distributor confirms, inventory added)

**Distributor → Client:**
1. PENDING (Order placed, unpaid)
2. PAID (Distributor manually marks)
3. PROCESSING (Distributor preparing)
4. FULFILLED (Distributor marks done, inventory deducted)

### 4. Payment Methods

- **Warehouse → Distributor:** M-Pesa (automated via API)
- **Distributor → Client:** Manual tracking (cash/bank transfer)

**Why different?** Client payments happen outside the app. Distributors track for their own records.

---

## 🛠 Development Workflow

### Adding a New Feature

1. **Read the TRD** - Check if feature is planned
2. **Check implementation-guide.md** - See if there's a task for it
3. **Create branch** - `git checkout -b feature/feature-name`
4. **Implement** - Write code following patterns
5. **Test** - Manual testing + write tests
6. **Update docs** - Run `/update-docs` skill
7. **Commit** - Descriptive commit message
8. **Push & PR** - Create pull request

### Adding a New API Route

**Example:** Creating `/api/products` endpoint

1. **Create route file:** `src/app/api/products/route.ts`
2. **Define Zod schema** for validation
3. **Implement handlers** (GET, POST, etc.)
4. **Add authentication** check
5. **Add authorization** (role-based)
6. **Handle errors** with try-catch
7. **Test** with Postman/Insomnia
8. **Document** in `.claude/api-reference.md`

**Template:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  // Define fields
});

export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication
    // 2. Check authorization
    // 3. Validate input
    // 4. Query database
    // 5. Return response
  } catch (error) {
    return NextResponse.json({ error: 'Error message' }, { status: 500 });
  }
}
```

### Adding a New Database Model

1. **Edit** `prisma/schema.prisma`
2. **Add model** with fields and relationships
3. **Create migration:** `npx prisma migrate dev --name add_model_name`
4. **Generate client:** `npx prisma generate`
5. **Update** `.claude/database-schema.md`
6. **Test** queries with Prisma Studio

### Adding a New UI Component

1. **Create component** in appropriate directory
2. **Use TypeScript** for props
3. **Follow Tailwind** for styling
4. **Make responsive** (mobile-first)
5. **Add to Storybook** (if using)
6. **Document** usage with JSDoc comments

---

## 🧪 Common Development Tasks

### Running the Project Locally (Future)

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Testing M-Pesa (Sandbox)

1. **Get sandbox credentials** from Daraja portal
2. **Set environment** to `sandbox`
3. **Use ngrok** for local callback URL:
   ```bash
   ngrok http 3000
   # Copy HTTPS URL to MPESA_CALLBACK_URL
   ```
4. **Test STK Push** with your Safaricom number
5. **Check callback** in terminal logs

**📖 See:** `.claude/mpesa-integration.md` for complete guide

### Debugging Issues

**Database issues:**
```bash
# Reset database (CAUTION: Deletes data)
npx prisma migrate reset

# View database in GUI
npx prisma studio
```

**Authentication issues:**
- Check Supabase dashboard for user
- Verify redirect URLs in Supabase settings
- Clear browser cookies
- Check middleware.ts configuration

**M-Pesa issues:**
- Verify callback URL is public HTTPS
- Check M-Pesa Daraja portal logs
- Use query API if callback delayed
- Check environment (sandbox vs production)

### Where to Find Logs

- **Development:** Terminal/console
- **Production (Vercel):** Vercel dashboard → Logs
- **Database:** Supabase dashboard → Logs
- **M-Pesa:** Daraja portal → Logs

---

## 🏗 Architecture Decisions

### Why Next.js 14 App Router?

- ✅ Server components for better performance
- ✅ Built-in API routes
- ✅ File-based routing
- ✅ Automatic code splitting
- ✅ Excellent TypeScript support
- ✅ Easy deployment to Vercel

### Why Prisma over Supabase Client?

- ✅ Better TypeScript types
- ✅ Migration management
- ✅ Schema as single source of truth
- ✅ Easier testing
- ⚠️  Still use Supabase for auth and hosting

### Why M-Pesa for Payments?

- ✅ Most popular payment method in Kenya
- ✅ Direct API integration
- ✅ No third-party payment gateway fees
- ✅ Instant confirmation via callback
- ⚠️  Only works in Kenya

### Key Trade-offs Made

**Single Warehouse (MVP):**
- ✅ Simpler implementation
- ✅ Faster to market
- ⚠️  Need refactor for multi-warehouse later

**Manual Client Payments:**
- ✅ Distributors want flexibility
- ✅ Avoids M-Pesa fees at client level
- ⚠️  Less automation

**No Offline Mode:**
- ✅ Simpler architecture
- ✅ Always up-to-date data
- ⚠️  Requires internet connection

---

## 📚 Resources

### Internal Documentation

- **Complete Requirements:** `/TRD.md`
- **Claude Context:** `.claude/claude.md`
- **Project Overview:** `.claude/project-overview.md`
- **Database Schema:** `.claude/database-schema.md`
- **API Reference:** `.claude/api-reference.md`
- **Implementation Guide:** `.claude/implementation-guide.md`
- **M-Pesa Integration:** `.claude/mpesa-integration.md`
- **Non-Technical Overview:** `/SYSTEM-OVERVIEW.md`

### External Documentation

- **Next.js:** https://nextjs.org/docs
- **Prisma:** https://www.prisma.io/docs
- **Supabase:** https://supabase.com/docs
- **M-Pesa Daraja:** https://developer.safaricom.co.ke
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs
- **React:** https://react.dev

### Team Contacts

- **Project Owner:** Jason Mbugua
- **Technical Lead:** [To be assigned]
- **Support:** [To be defined]

### Support Channels

- **GitHub Issues:** For bugs and features
- **Team Chat:** [To be defined]
- **Email:** [To be defined]

---

## 🎯 Current Implementation Status

**Phase:** Planning / Not Started
**Progress:** 0% (0/77 tasks complete)
**Current Focus:** Documentation complete, ready to start Week 1

### What's Implemented

- ✅ Complete TRD (Technical Requirements Document)
- ✅ Claude AI documentation suite
- ✅ Database schema designed
- ✅ API structure planned
- ✅ 11-week implementation guide
- ✅ M-Pesa integration guide

### What's Next (Week 1-2)

- [ ] Initialize Next.js project
- [ ] Setup Supabase
- [ ] Create database schema
- [ ] Implement authentication
- [ ] Create dashboard layouts

**📖 See:** `.claude/implementation-guide.md` for complete checklist

---

## 🤝 Contributing

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes, commit frequently
git add .
git commit -m "feat: add feature description"

# Push to remote
git push -u origin feature/feature-name

# Create pull request on GitHub
```

### Commit Message Convention

```
feat: Add M-Pesa payment integration
fix: Resolve inventory sync issue
docs: Update README with setup instructions
refactor: Simplify order fulfillment logic
test: Add unit tests for payment service
chore: Update dependencies
```

### Code Review Checklist

Before submitting PR:
- [ ] Code follows TypeScript best practices
- [ ] All functions have proper types
- [ ] Error handling implemented
- [ ] Authentication/authorization checked
- [ ] Database queries optimized
- [ ] UI is responsive
- [ ] Tested manually
- [ ] Documentation updated
- [ ] No console.logs in production code

---

## ⚠️ Important Notes

### Security

- **Never commit** `.env.local` to Git
- **Always validate** user inputs (client + server)
- **Use Prisma** parameterized queries (prevents SQL injection)
- **Implement RLS** in Supabase for data protection
- **Verify** M-Pesa callback source

### Performance

- **Use pagination** (20 items per page)
- **Add database indexes** on frequently queried fields
- **Optimize images** with Next.js Image component
- **Debounce** search inputs (300ms)
- **Cache** API responses when appropriate

### Data Integrity

- **Always use transactions** for multi-step operations
- **Log all inventory changes** in InventoryTransaction table
- **Use soft deletes** (isActive flag) to preserve history
- **Validate** order totals match item subtotals

---

## 🆘 Getting Help

**Stuck on something?**

1. **Check the docs** - Start with `.claude/claude.md`
2. **Read the TRD** - Detailed requirements in `/TRD.md`
3. **Search codebase** - Use global search for similar patterns
4. **Ask Claude** - Reference this documentation
5. **Create issue** - If you found a bug or need feature
6. **Ask team** - Don't struggle alone!

**Common questions answered in:**
- How to add a feature? → This file, "Development Workflow"
- How does M-Pesa work? → `.claude/mpesa-integration.md`
- What's the database structure? → `.claude/database-schema.md`
- What are the API endpoints? → `.claude/api-reference.md`
- What's the implementation order? → `.claude/implementation-guide.md`

---

**Happy Coding! 🚀**

**Pro Tip:** Run `/update-docs` skill regularly to keep this guide in sync with the codebase!

---

**Last Updated:** 2025-11-18
**Version:** 1.0 (Planning Phase)
**Next Review:** After Week 1-2 implementation
