# Warehouse Supply Chain Management System
## Step-by-Step Implementation Plan

**Project:** Muchiri Warehouse Management System
**Timeline:** 11 Weeks (58 Milestones)
**Status:** Ready to Execute
**Last Updated:** November 18, 2025

---

## 📊 Project Overview

This implementation plan breaks down the warehouse management system into 10 phases with 58 actionable milestones. Each milestone includes specific tasks, deliverables, and acceptance criteria.

### Quick Reference
- **Total Phases:** 10
- **Total Milestones:** 58
- **Estimated Timeline:** 11 weeks
- **Tech Stack:** Next.js 14+, TypeScript, PostgreSQL, Prisma, Supabase, M-Pesa

---

## 🎯 PHASE 1: PROJECT FOUNDATION (Week 1-2)

### Milestone 1.1: Initial Project Setup (Days 1-2)

**Objective:** Initialize Next.js project with all required dependencies

**Tasks:**
- [ ] Create Next.js 14+ project with TypeScript
  ```bash
  npx create-next-app@latest muchiri-warehouse --typescript --tailwind --app --eslint
  cd muchiri-warehouse
  ```
- [ ] Configure Tailwind CSS (verify tailwind.config.ts)
- [ ] Setup ESLint and Prettier configurations
- [ ] Create project folder structure
- [ ] Initialize Git repository and create `.gitignore`

**Folder Structure to Create:**
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (owner)/
│   │   └── dashboard/
│   ├── (manager)/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── orders/
│   │   └── distributors/
│   ├── (distributor)/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── orders/
│   │   └── clients/
│   ├── (client)/
│   │   ├── dashboard/
│   │   ├── products/
│   │   └── orders/
│   ├── api/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── orders/
│   └── shared/
├── lib/
│   ├── supabase/
│   ├── mpesa/
│   ├── email/
│   └── utils/
├── types/
│   └── index.ts
└── hooks/
```

**Dependencies to Install:**
```bash
# Core dependencies
npm install prisma @prisma/client
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install react-hook-form zod @hookform/resolvers
npm install recharts
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install date-fns
npm install axios

# Dev dependencies
npm install -D @types/node
```

**Files to Create:**
- `src/lib/utils.ts` - Utility functions (cn helper)
- `src/types/index.ts` - TypeScript type definitions
- `.env.local.example` - Environment variable template
- `README.md` - Project documentation

**Acceptance Criteria:**
- [ ] Project builds without errors (`npm run build`)
- [ ] Development server runs (`npm run dev`)
- [ ] All dependencies installed
- [ ] Folder structure created
- [ ] Git repository initialized

---

### Milestone 1.2: Supabase Setup (Days 3-4)

**Objective:** Create and configure Supabase project for database and authentication

**Tasks:**
- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project "muchiri-warehouse"
- [ ] Select database region (closest to Kenya)
- [ ] Save database password securely
- [ ] Get database connection strings
- [ ] Get Supabase API keys

**Configuration Steps:**

1. **Get Credentials from Supabase Dashboard:**
   - Settings → API → Copy Project URL
   - Settings → API → Copy anon public key
   - Settings → API → Copy service_role key
   - Settings → Database → Copy connection string

2. **Create `.env.local`:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Configure Auth Providers:**
   - Authentication → Providers → Enable "Email" (Magic Link)
   - Authentication → Providers → Enable "Google"
   - Add redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://yourdomain.com/auth/callback` (for production)

4. **Create Supabase Client Files:**

`src/lib/supabase/client.ts`:
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createClientComponentClient();
```

`src/lib/supabase/server.ts`:
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createClient = () => {
  return createServerComponentClient({ cookies });
};
```

**Acceptance Criteria:**
- [ ] Supabase project created
- [ ] All credentials saved in `.env.local`
- [ ] Supabase client files created
- [ ] Can connect to Supabase (test with simple query)
- [ ] Auth providers configured

---

### Milestone 1.3: Database Schema with Prisma (Days 5-6)

**Objective:** Define and migrate complete database schema

**Tasks:**
- [ ] Initialize Prisma
- [ ] Create complete Prisma schema
- [ ] Run database migrations
- [ ] Generate Prisma Client
- [ ] Test database connection

**Steps:**

1. **Initialize Prisma:**
```bash
npx prisma init
```

2. **Update `prisma/schema.prisma`:**

Copy the complete schema from `.claude/database-schema.md`. Here's the full schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ==================== USERS & AUTHENTICATION ====================

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  fullName    String
  phoneNumber String?
  role        UserRole
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([email])
  @@index([role])
}

enum UserRole {
  OWNER
  MANAGER
  DISTRIBUTOR
  CLIENT
}

// ==================== WAREHOUSE & MANAGERS ====================

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

// ==================== PRODUCTS ====================

model Product {
  id        String   @id @default(uuid())
  name      String
  flavor    String
  category  String
  sku       String   @unique
  unitPrice Decimal  @db.Decimal(10, 2)
  imageUrl  String?
  createdAt DateTime @default(now())
  isActive  Boolean  @default(true)

  @@index([sku])
  @@index([isActive])
  @@index([category])
}

// ==================== INVENTORY ====================

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

// ==================== DISTRIBUTORS & CLIENTS ====================

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
  id               String    @id @default(uuid())
  warehouseId      String
  distributorId    String
  addedByManagerId String
  addedAt          DateTime  @default(now())
  removedAt        DateTime?
  isActive         Boolean   @default(true)

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

// ==================== ORDERS ====================

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

// ==================== PAYMENTS ====================

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

// ==================== INVENTORY TRANSACTIONS ====================

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

3. **Create Prisma Client Singleton:**

`src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

4. **Run Migrations:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. **Test Connection:**
```bash
npx prisma studio
```

**Acceptance Criteria:**
- [ ] Prisma schema created with all 12 models
- [ ] Migration successful
- [ ] Prisma Client generated
- [ ] Prisma Studio opens and shows all tables
- [ ] Can query database

---

### Milestone 1.4: Authentication Implementation (Days 6-7)

**Objective:** Implement complete authentication system with Google OAuth and Magic Link

**Tasks:**
- [ ] Create login page
- [ ] Create auth callback handler
- [ ] Implement middleware for route protection
- [ ] Test authentication flows

**Files to Create:**

**1. Login Page:** `src/app/(auth)/login/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Check your email for the magic link!');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Warehouse Management
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Magic Link */}
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <div
            className={`p-4 rounded-md ${
              message.startsWith('Error')
                ? 'bg-red-50 text-red-800'
                : 'bg-green-50 text-green-800'
            }`}
          >
            <p className="text-sm">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**2. Auth Callback:** `src/app/auth/callback/route.ts`
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home page (will be redirected to role-specific dashboard by middleware)
  return NextResponse.redirect(requestUrl.origin);
}
```

**3. Middleware:** `src/middleware.ts`
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/callback'];
  const isPublicRoute = publicRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // If authenticated and on login page, redirect to dashboard
  if (session && req.nextUrl.pathname === '/auth/login') {
    // TODO: Redirect based on user role (will implement after user profile lookup)
    return NextResponse.redirect(new URL('/manager/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
```

**4. Temporary Dashboard Pages:**

`src/app/(manager)/dashboard/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ManagerDashboard() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Manager Dashboard</h1>
      <p className="mt-4">Welcome, {session.user.email}</p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Products</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Orders</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Inventory Items</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
```

`src/app/(manager)/layout.tsx`:
```typescript
export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Warehouse Manager</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Login page displays correctly
- [ ] Google OAuth flow works
- [ ] Magic Link email sent
- [ ] Users can authenticate
- [ ] Middleware redirects unauthenticated users
- [ ] Dashboard shows after login

---

## 🏗️ PHASE 2: MANAGER FEATURES (Week 3-5)

### Milestone 2.1: Product Management System (Days 8-10)

**Objective:** Complete CRUD operations for products

**Tasks:**
- [ ] Create product list page
- [ ] Create add product form
- [ ] Create edit product form
- [ ] Implement API routes for products
- [ ] Add Zod validation

**Files to Create:**

**1. Product Types:** `src/types/index.ts`
```typescript
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  flavor: z.string().min(1, 'Flavor is required').max(50),
  category: z.string().min(1, 'Category is required').max(50),
  sku: z.string().min(1, 'SKU is required').max(50),
  unitPrice: z.number().positive('Price must be positive'),
  initialStock: z.number().int().min(0, 'Stock must be non-negative'),
  reorderLevel: z.number().int().min(0).default(50),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export type ProductFormData = z.infer<typeof productSchema>;
```

**2. API Route - Get Products:** `src/app/api/products/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { productSchema } from '@/types';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        warehouseInventory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = productSchema.parse(body);

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || (user.role !== 'MANAGER' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get warehouse ID (for MVP, we'll use the first warehouse)
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      return NextResponse.json({ error: 'No warehouse found' }, { status: 404 });
    }

    // Create product and inventory in transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: validated.name,
          flavor: validated.flavor,
          category: validated.category,
          sku: validated.sku,
          unitPrice: validated.unitPrice,
          imageUrl: validated.imageUrl || null,
        },
      });

      const inventory = await tx.warehouseInventory.create({
        data: {
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: validated.initialStock,
          reorderLevel: validated.reorderLevel,
          lastRestockedAt: new Date(),
        },
      });

      // Create initial inventory transaction
      await tx.inventoryTransaction.create({
        data: {
          warehouseId: warehouse.id,
          productId: product.id,
          transactionType: 'RESTOCK',
          quantityChange: validated.initialStock,
          balanceAfter: validated.initialStock,
          performedByUserId: user.id,
          notes: 'Initial stock',
        },
      });

      return { product, inventory };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
```

**3. API Route - Single Product:** `src/app/api/products/[id]/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  flavor: z.string().min(1).max(50).optional(),
  category: z.string().min(1).max(50).optional(),
  unitPrice: z.number().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        warehouseInventory: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || (user.role !== 'MANAGER' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateProductSchema.parse(body);

    const product = await prisma.product.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || (user.role !== 'MANAGER' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
```

**4. Products Page:** `src/app/(manager)/products/page.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  flavor: string;
  category: string;
  sku: string;
  unitPrice: number;
  isActive: boolean;
  warehouseInventory: Array<{
    quantity: number;
    reorderLevel: number;
  }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this product?')) return;

    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link
          href="/manager/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No products yet. Add your first product!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const inventory = product.warehouseInventory[0];
                const isLowStock =
                  inventory && inventory.quantity < inventory.reorderLevel;

                return (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">{product.flavor}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      KES {product.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isLowStock
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {inventory?.quantity || 0} units
                        {isLowStock && ' (Low)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/manager/products/${product.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**5. Add Product Page:** `src/app/(manager)/products/new/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '@/types';

export default function NewProductPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      reorderLevel: 50,
      initialStock: 0,
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      router.push('/manager/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Add New Product</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Coca Cola"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flavor *
              </label>
              <input
                {...register('flavor')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Original"
              />
              {errors.flavor && (
                <p className="mt-1 text-sm text-red-600">{errors.flavor.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <input
                {...register('category')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Carbonated Drinks"
              />
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU *
              </label>
              <input
                {...register('sku')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="CC-001"
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price (KES) *
              </label>
              <input
                {...register('unitPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="50.00"
              />
              {errors.unitPrice && (
                <p className="mt-1 text-sm text-red-600">{errors.unitPrice.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Stock *
              </label>
              <input
                {...register('initialStock', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="100"
              />
              {errors.initialStock && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.initialStock.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Level
              </label>
              <input
                {...register('reorderLevel', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
              />
              {errors.reorderLevel && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.reorderLevel.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL (optional)
              </label>
              <input
                {...register('imageUrl')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
              {errors.imageUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Can list all products
- [ ] Can add new product with validation
- [ ] Product creation creates inventory record
- [ ] Product creation creates transaction record
- [ ] Can view product details
- [ ] Can edit product (except SKU)
- [ ] Can soft delete product
- [ ] Low stock indicator shows correctly
- [ ] Form validation works (client and server)
- [ ] Duplicate SKU prevented

**Testing Checklist:**
- [ ] Add product with all fields
- [ ] Add product with minimal fields
- [ ] Try duplicate SKU (should fail)
- [ ] Edit product price
- [ ] Delete product (should set isActive=false)
- [ ] Verify inventory record created
- [ ] Verify transaction record created

---

### Milestone 2.2: Inventory Management (Days 11-14)

**Objective:** Complete warehouse inventory management with restock and adjustment features

**Tasks:**
- [ ] Create inventory dashboard page
- [ ] Implement restock functionality
- [ ] Implement inventory adjustment
- [ ] Add low stock alerts
- [ ] Create inventory API routes

[Continue with inventory implementation files...]

**Acceptance Criteria:**
- [ ] Inventory list shows all products with stock levels
- [ ] Low stock products highlighted
- [ ] Can restock products
- [ ] Can adjust inventory with notes
- [ ] All changes create transaction records
- [ ] Search and filter works

---

### Milestone 2.3: Order Management (Days 15-18)

[Continue with order management implementation...]

---

### Milestone 2.4: Distributor Management (Days 19-21)

[Continue with distributor management implementation...]

---

## 💳 PHASE 3: M-PESA INTEGRATION (Week 4)

[Continue with M-Pesa implementation...]

---

## 🚚 PHASE 4: DISTRIBUTOR FEATURES (Week 6-7)

[Continue with distributor features...]

---

## 👥 PHASE 5: CLIENT FEATURES (Week 7)

[Continue with client features...]

---

## 📊 PHASE 6: OWNER DASHBOARD (Week 8)

[Continue with owner dashboard...]

---

## 📧 PHASE 7: EMAIL NOTIFICATIONS (Week 9)

[Continue with email notifications...]

---

## ✅ PHASE 8: TESTING & REFINEMENT (Week 10)

[Continue with testing...]

---

## 🚀 PHASE 9: DEPLOYMENT (Week 11)

[Continue with deployment...]

---

## 📈 PHASE 10: POST-LAUNCH (Week 12+)

[Continue with post-launch activities...]

---

## 📋 PROGRESS TRACKING

### Completed Milestones: 0/58
### Current Phase: Not Started
### Overall Progress: 0%

**Next Steps:**
1. Start with Milestone 1.1: Initialize Next.js project
2. Follow the checklist systematically
3. Test each milestone before proceeding
4. Document any deviations or issues

---

**End of Implementation Plan**

This plan will be updated as milestones are completed and new requirements emerge.
