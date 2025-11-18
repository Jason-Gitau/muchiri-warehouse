# Implementation Guide

Step-by-step guide to implement the Warehouse Supply Chain Management System from scratch.

---

## Implementation Timeline: 11 Weeks

```
Week 1-2:  Foundation (Project setup, database, auth)
Week 3-5:  Core Features (Products, orders, M-Pesa)
Week 6-7:  Distributor & Client (Full supply chain)
Week 8:    Owner Dashboard (Analytics, reports)
Week 9:    Email Notifications
Week 10:   Testing & Refinement
Week 11:   Deployment & Go-Live
Week 12+:  Post-Launch Monitoring
```

---

## Phase 1: Foundation (Week 1-2)

### Week 1: Project Setup & Database

#### Day 1-2: Initialize Next.js Project

**Tasks:**
- [ ] Create Next.js 14+ project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Setup ESLint and Prettier
- [ ] Install core dependencies
- [ ] Setup Git repository
- [ ] Create project structure

**Commands:**
```bash
# Create Next.js app
npx create-next-app@latest warehouse-app --typescript --tailwind --app --eslint

cd warehouse-app

# Install dependencies
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

**Project Structure:**
```
src/
├── app/
│   ├── (auth)/
│   ├── (owner)/
│   ├── (manager)/
│   ├── (distributor)/
│   ├── (client)/
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
└── hooks/
```

**Files to Create:**
- `src/lib/utils.ts` - Utility functions
- `src/types/index.ts` - TypeScript types
- `tailwind.config.ts` - Tailwind configuration
- `.env.local` - Environment variables (template)

---

#### Day 3-4: Supabase Setup

**Tasks:**
- [ ] Create Supabase project at supabase.com
- [ ] Get database connection string
- [ ] Get Supabase API keys
- [ ] Configure Supabase Auth
- [ ] Enable Google OAuth
- [ ] Configure Magic Link settings

**Steps:**

1. **Create Supabase Project:**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Name: "muchiri-warehouse"
   - Database password: (save securely)
   - Region: Select closest to Kenya

2. **Get Credentials:**
   - Settings → API
   - Copy: Project URL, anon public key, service_role key
   - Settings → Database → Connection string
   - Copy: Postgres connection string

3. **Add to `.env.local`:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
```

4. **Configure Auth Providers:**
   - Authentication → Providers
   - Enable "Email" (for Magic Link)
   - Enable "Google"
   - Add authorized redirect URLs:
     - http://localhost:3000/auth/callback
     - https://yourdomain.com/auth/callback

5. **Create Supabase Client:**

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

---

#### Day 5-6: Database Schema with Prisma

**Tasks:**
- [ ] Install Prisma
- [ ] Create schema.prisma file
- [ ] Define all models (see database-schema.md)
- [ ] Run migrations
- [ ] Generate Prisma Client
- [ ] Test database connection

**Steps:**

1. **Initialize Prisma:**
```bash
npx prisma init
```

2. **Edit `prisma/schema.prisma`:**

Copy complete schema from `.claude/database-schema.md`

Key models to include:
- User, UserRole enum
- Warehouse, WarehouseManager
- Product
- WarehouseInventory, DistributorInventory
- Distributor, WarehouseDistributor, Client
- Order (with enums), OrderItem
- Payment, ClientPayment
- InventoryTransaction

3. **Create Migration:**
```bash
npx prisma migrate dev --name init
```

4. **Generate Prisma Client:**
```bash
npx prisma generate
```

5. **Test Connection:**
```bash
npx prisma studio
```

6. **Create Prisma Client Instance:**

`src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

#### Day 7: Authentication Implementation

**Tasks:**
- [ ] Create auth pages (login, signup)
- [ ] Implement Google OAuth flow
- [ ] Implement Magic Link flow
- [ ] Create auth middleware
- [ ] Setup role-based routing

**Files to Create:**

`src/app/(auth)/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Check your email for the magic link!');
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

    if (error) alert(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center">Sign In</h2>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
        >
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        {/* Magic Link */}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

`src/app/auth/callback/route.ts`:
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

  return NextResponse.redirect(requestUrl.origin);
}
```

`src/middleware.ts`:
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

  // Redirect to login if not authenticated
  if (!session && !req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
```

---

### Week 2: Role-Based Dashboards

#### Day 8-9: Create Dashboard Layouts

**Tasks:**
- [ ] Create dashboard layout component
- [ ] Create sidebar navigation
- [ ] Implement role-based routing
- [ ] Create dashboard home pages for each role

**Files to Create:**

`src/app/(manager)/layout.tsx`:
```typescript
import Sidebar from '@/components/dashboard/Sidebar';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar role="MANAGER" />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
```

`src/components/dashboard/Sidebar.tsx`:
```typescript
import Link from 'next/link';
import { UserRole } from '@prisma/client';

const menuItems = {
  MANAGER: [
    { href: '/manager/dashboard', label: 'Dashboard', icon: 'Home' },
    { href: '/manager/products', label: 'Products', icon: 'Package' },
    { href: '/manager/inventory', label: 'Inventory', icon: 'Warehouse' },
    { href: '/manager/orders', label: 'Orders', icon: 'ShoppingCart' },
    { href: '/manager/distributors', label: 'Distributors', icon: 'Users' },
  ],
  // Add other roles...
};

export default function Sidebar({ role }: { role: UserRole }) {
  const items = menuItems[role];

  return (
    <aside className="w-64 bg-white shadow-md">
      <div className="p-4">
        <h1 className="text-xl font-bold">Warehouse</h1>
      </div>
      <nav className="mt-8">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

---

#### Day 10-14: Basic Dashboard Pages

**Create placeholder pages for each role:**

- [ ] Manager Dashboard (`/manager/dashboard`)
- [ ] Owner Dashboard (`/owner/dashboard`)
- [ ] Distributor Dashboard (`/distributor/dashboard`)
- [ ] Client Dashboard (`/client/dashboard`)

**Each dashboard should:**
- Show welcome message
- Display basic stats (placeholder)
- Have navigation working

---

## Phase 2: Core Features (Week 3-5)

### Week 3: Product & Inventory Management

#### Day 15-16: Product Management

**Tasks:**
- [ ] Create product list page
- [ ] Create add product form
- [ ] Create edit product form
- [ ] Implement product CRUD API routes
- [ ] Add validation with Zod

**API Routes:**

`src/app/api/products/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1).max(100),
  flavor: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  sku: z.string().min(1).max(50),
  unitPrice: z.number().positive(),
  initialStock: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).default(50),
  imageUrl: z.string().url().optional(),
});

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        warehouseInventory: true,
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = productSchema.parse(body);

    // Create product and inventory in transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: validated.name,
          flavor: validated.flavor,
          category: validated.category,
          sku: validated.sku,
          unitPrice: validated.unitPrice,
          imageUrl: validated.imageUrl,
        },
      });

      const inventory = await tx.warehouseInventory.create({
        data: {
          warehouseId: 'warehouse-id', // Get from user session
          productId: product.id,
          quantity: validated.initialStock,
          reorderLevel: validated.reorderLevel,
          lastRestockedAt: new Date(),
        },
      });

      // Create initial inventory transaction
      await tx.inventoryTransaction.create({
        data: {
          warehouseId: 'warehouse-id',
          productId: product.id,
          transactionType: 'RESTOCK',
          quantityChange: validated.initialStock,
          balanceAfter: validated.initialStock,
          performedByUserId: 'user-id', // Get from session
          notes: 'Initial stock',
        },
      });

      return { product, inventory };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
```

---

#### Day 17-18: Inventory Management

**Tasks:**
- [ ] Create warehouse inventory view
- [ ] Implement restock functionality
- [ ] Create inventory adjustment form
- [ ] Add low stock alerts
- [ ] Create inventory API routes

**API Route:**

`src/app/api/inventory/restock/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const restockSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = restockSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Get current inventory
      const inventory = await tx.warehouseInventory.findFirst({
        where: {
          warehouseId: 'warehouse-id',
          productId: validated.productId,
        },
      });

      if (!inventory) {
        throw new Error('Inventory not found');
      }

      const newQuantity = inventory.quantity + validated.quantity;

      // Update inventory
      const updated = await tx.warehouseInventory.update({
        where: { id: inventory.id },
        data: {
          quantity: newQuantity,
          lastRestockedAt: new Date(),
        },
      });

      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          warehouseId: 'warehouse-id',
          productId: validated.productId,
          transactionType: 'RESTOCK',
          quantityChange: validated.quantity,
          balanceAfter: newQuantity,
          performedByUserId: 'user-id',
          notes: validated.notes,
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Restock failed' }, { status: 500 });
  }
}
```

---

#### Day 19-21: Order Management (Warehouse → Distributor)

**Tasks:**
- [ ] Create order list page (Manager view)
- [ ] Create order detail page
- [ ] Implement order creation (Distributor view)
- [ ] Create shopping cart component
- [ ] Implement order status updates
- [ ] Create order API routes

**Key Functionality:**
- Distributors can browse products and add to cart
- Checkout creates order with UNPAID status
- Manager can view and update order status
- Order fulfillment reduces warehouse inventory

---

### Week 4: M-Pesa Integration

See `.claude/mpesa-integration.md` for detailed implementation.

#### Day 22-23: M-Pesa Setup

**Tasks:**
- [ ] Register for M-Pesa Daraja API (sandbox)
- [ ] Get consumer key and consumer secret
- [ ] Setup callback URL (use ngrok for local testing)
- [ ] Create M-Pesa helper functions
- [ ] Implement access token generation

**Files to Create:**

`src/lib/mpesa/config.ts`:
```typescript
export const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE!,
  passkey: process.env.MPESA_PASSKEY!,
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  baseUrl:
    process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke',
};
```

`src/lib/mpesa/auth.ts`:
```typescript
import axios from 'axios';
import { mpesaConfig } from './config';

export async function getMpesaAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`
  ).toString('base64');

  const response = await axios.get(
    `${mpesaConfig.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return response.data.access_token;
}
```

---

#### Day 24-26: STK Push Implementation

**Tasks:**
- [ ] Implement STK Push API route
- [ ] Create payment initiation UI
- [ ] Implement callback handler
- [ ] Test with sandbox
- [ ] Add error handling

**API Route:**

`src/app/api/mpesa/stk-push/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import axios from 'axios';
import { getMpesaAccessToken } from '@/lib/mpesa/auth';
import { mpesaConfig } from '@/lib/mpesa/config';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { orderId, phoneNumber, amount } = await request.json();

    // Validate order exists and is unpaid
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order || order.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
    }

    // Get access token
    const accessToken = await getMpesaAccessToken();

    // Generate timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, -3);

    // Generate password
    const password = Buffer.from(
      `${mpesaConfig.businessShortCode}${mpesaConfig.passkey}${timestamp}`
    ).toString('base64');

    // STK Push request
    const response = await axios.post(
      `${mpesaConfig.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: mpesaConfig.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.floor(amount),
        PartyA: phoneNumber,
        PartyB: mpesaConfig.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: mpesaConfig.callbackUrl,
        AccountReference: order.orderNumber,
        TransactionDesc: `Payment for Order ${order.orderNumber}`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Update payment record
    await prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount,
        paymentMethod: 'M-PESA',
        mpesaPhoneNumber: phoneNumber,
        mpesaTransactionId: response.data.CheckoutRequestID,
        status: 'PENDING',
      },
      update: {
        mpesaTransactionId: response.data.CheckoutRequestID,
        status: 'PENDING',
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('STK Push error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Payment initiation failed' },
      { status: 500 }
    );
  }
}
```

See `.claude/mpesa-integration.md` for callback implementation.

---

#### Day 27-28: Payment Verification

**Tasks:**
- [ ] Implement callback route
- [ ] Test callback with sandbox
- [ ] Implement query status fallback
- [ ] Add payment status page
- [ ] Test end-to-end payment flow

---

### Week 5: Order Fulfillment

#### Day 29-31: Manager Order Processing

**Tasks:**
- [ ] Implement order fulfillment workflow
- [ ] Create inventory deduction logic
- [ ] Add inventory transaction logging
- [ ] Test complete order flow (create → pay → fulfill)

#### Day 32-35: Distributor Order Receipt

**Tasks:**
- [ ] Implement "Mark as Received" functionality
- [ ] Create distributor inventory update logic
- [ ] Add inventory transaction logging
- [ ] Test distributor inventory synchronization

---

## Phase 3: Distributor & Client Features (Week 6-7)

### Week 6: Client Management

#### Day 36-38: Client CRUD Operations

**Tasks:**
- [ ] Create client list page (Distributor view)
- [ ] Implement add client form
- [ ] Create client invitation email
- [ ] Implement client removal
- [ ] Create client API routes

#### Day 39-42: Client Product Catalog

**Tasks:**
- [ ] Create client product browse page
- [ ] Implement shopping cart for clients
- [ ] Create client checkout flow
- [ ] Show products from distributor's inventory only

---

### Week 7: Client Orders

#### Day 43-45: Client Order Placement

**Tasks:**
- [ ] Implement client order creation
- [ ] Create order confirmation page
- [ ] Send order notification emails

#### Day 46-49: Distributor Client Order Management

**Tasks:**
- [ ] Create client orders list (Distributor view)
- [ ] Implement manual payment marking (ClientPayment)
- [ ] Implement order fulfillment (reduce distributor inventory)
- [ ] Test complete client order flow

---

## Phase 4: Owner Dashboard (Week 8)

### Week 8: Analytics & Reports

#### Day 50-52: Revenue Analytics

**Tasks:**
- [ ] Create revenue trend chart (12 months)
- [ ] Implement revenue calculation queries
- [ ] Add date range filters
- [ ] Create revenue report API

#### Day 53-54: Product Analytics

**Tasks:**
- [ ] Implement top-selling products report
- [ ] Create product performance charts
- [ ] Add category filtering

#### Day 55-56: Distributor Performance

**Tasks:**
- [ ] Create distributor performance table
- [ ] Calculate metrics (total orders, revenue, avg order value)
- [ ] Add sortable columns
- [ ] Implement distributor comparison

---

## Phase 5: Email Notifications (Week 9)

### Week 9: Email Service

#### Day 57-58: Email Service Setup

**Tasks:**
- [ ] Sign up for Resend or SendGrid
- [ ] Get API key
- [ ] Configure sending domain
- [ ] Create email helper functions

**Setup:**

`src/lib/email/config.ts`:
```typescript
import { Resend } from 'resend';

export const resend = new Resend(process.env.EMAIL_API_KEY);
```

#### Day 59-61: Email Templates

**Tasks:**
- [ ] Create email templates (React Email or HTML)
- [ ] Templates needed:
  - Order confirmation (distributor, client)
  - Order fulfilled
  - Payment confirmed
  - Payment failed
  - Low stock alert
  - Distributor changed

#### Day 62-63: Email Triggers

**Tasks:**
- [ ] Add email sending to order creation
- [ ] Add email to order fulfillment
- [ ] Add email to payment callback
- [ ] Add email to low stock detection
- [ ] Test all email flows

---

## Phase 6: Testing & Refinement (Week 10)

### Week 10: Quality Assurance

#### Day 64-66: Functional Testing

**Test Scenarios:**
- [ ] User authentication (all methods)
- [ ] Role-based access control
- [ ] Product management (CRUD)
- [ ] Inventory management (restock, adjust)
- [ ] Order flow (warehouse → distributor)
- [ ] M-Pesa payment (sandbox)
- [ ] Order flow (distributor → client)
- [ ] Manual payment marking
- [ ] Order fulfillment (both levels)
- [ ] Inventory synchronization
- [ ] Email delivery (all types)
- [ ] Analytics and reports
- [ ] Distributor removal & client reassignment

#### Day 67-68: Bug Fixes

**Focus Areas:**
- [ ] Fix any discovered bugs
- [ ] Improve error handling
- [ ] Add loading states
- [ ] Improve validation messages

#### Day 69-70: Performance Optimization

**Tasks:**
- [ ] Add database indexes
- [ ] Optimize slow queries
- [ ] Implement pagination
- [ ] Add image optimization
- [ ] Test with large datasets

---

## Phase 7: Deployment (Week 11)

### Week 11: Go-Live Preparation

#### Day 71-73: Vercel Deployment

**Tasks:**
- [ ] Create Vercel account
- [ ] Link GitHub repository
- [ ] Configure environment variables in Vercel
- [ ] Deploy to preview
- [ ] Test preview deployment

**Steps:**

1. **Connect to Vercel:**
   - Go to https://vercel.com
   - Import GitHub repository
   - Select framework: Next.js
   - Configure build settings (automatic)

2. **Add Environment Variables:**
   - Settings → Environment Variables
   - Add all variables from `.env.local`
   - Separate for Production, Preview, Development

3. **Deploy:**
   - Push to main branch
   - Vercel auto-deploys
   - Check deployment logs

#### Day 74-75: Production M-Pesa Setup

**Tasks:**
- [ ] Submit M-Pesa production credentials request
- [ ] Update environment variables with production keys
- [ ] Update callback URL to production domain
- [ ] Test with real M-Pesa (small amount)

#### Day 76-77: Custom Domain & SSL

**Tasks:**
- [ ] Purchase domain (if not already owned)
- [ ] Add domain in Vercel
- [ ] Configure DNS records
- [ ] Verify SSL certificate (automatic)
- [ ] Test with custom domain

---

## Phase 8: Post-Launch (Week 12+)

### Week 12+: Monitoring & Iteration

#### Ongoing Tasks

**Daily:**
- [ ] Monitor error logs (Vercel dashboard)
- [ ] Check M-Pesa payment failures
- [ ] Respond to user support requests

**Weekly:**
- [ ] Review performance metrics
- [ ] Backup database (Supabase automatic)
- [ ] Review user feedback
- [ ] Plan feature improvements

**Monthly:**
- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance review
- [ ] User satisfaction survey

---

## Development Best Practices

### Code Quality

**TypeScript:**
- Use strict mode
- Define interfaces for all props
- Avoid `any` types

**Components:**
- Keep components small and focused
- Use composition over inheritance
- Extract reusable logic to hooks

**API Routes:**
- Validate all inputs with Zod
- Use try-catch for error handling
- Return consistent error formats
- Log errors for debugging

**Database:**
- Use transactions for multi-step operations
- Always log inventory changes
- Use soft deletes (isActive flag)
- Add indexes for frequently queried fields

### Testing Strategy

**Manual Testing:**
- Test all user flows for each role
- Test on different devices (desktop, mobile, tablet)
- Test with different browsers (Chrome, Safari, Firefox)
- Test error scenarios (invalid inputs, network failures)

**Automated Testing (Optional):**
- Unit tests for utility functions
- Integration tests for API routes
- E2E tests for critical flows (Playwright/Cypress)

### Security Checklist

- [ ] Environment variables never committed to Git
- [ ] All API routes have authentication checks
- [ ] Role-based authorization implemented
- [ ] Input validation on client and server
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (React auto-escaping)
- [ ] HTTPS enforced (Vercel automatic)
- [ ] M-Pesa callback validation
- [ ] Supabase RLS policies enabled

---

## Troubleshooting Guide

### Common Issues

**Prisma Migration Fails:**
```bash
# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Or apply migrations manually
npx prisma db push
```

**M-Pesa Callback Not Received:**
- Check callback URL is publicly accessible (use ngrok for local)
- Verify URL in M-Pesa dashboard matches
- Check M-Pesa sandbox logs
- Ensure endpoint returns 200 OK

**Supabase Auth Not Working:**
- Check redirect URLs in Supabase dashboard
- Verify environment variables are correct
- Check middleware.ts is configured properly
- Clear browser cookies and try again

**Build Errors on Vercel:**
- Check all environment variables are set
- Verify no TypeScript errors: `npm run type-check`
- Check build logs in Vercel dashboard
- Test local build: `npm run build`

---

## Resources

**Documentation:**
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Supabase: https://supabase.com/docs
- M-Pesa Daraja: https://developer.safaricom.co.ke
- Tailwind CSS: https://tailwindcss.com/docs
- Zod: https://zod.dev

**Tutorials:**
- Next.js 14 Tutorial: https://nextjs.org/learn
- Supabase Auth Guide: https://supabase.com/docs/guides/auth
- M-Pesa Integration: https://developer.safaricom.co.ke/docs

---

## Success Criteria

**Technical:**
- ✅ All user roles can access their dashboards
- ✅ Products can be created and managed
- ✅ Orders flow correctly (warehouse → distributor → client)
- ✅ M-Pesa payments process successfully (>95% success rate)
- ✅ Inventory syncs correctly across all levels
- ✅ Emails send for all triggers
- ✅ Analytics display correct data
- ✅ Page load time < 2 seconds
- ✅ API response time < 500ms
- ✅ Zero security vulnerabilities

**Business:**
- ✅ Distributors can place and pay for orders
- ✅ Managers can fulfill orders efficiently
- ✅ Clients can browse and order products
- ✅ Owner can view business analytics
- ✅ Complete audit trail for all transactions
- ✅ System handles 100+ concurrent users

---

**Version:** 1.0
**Last Updated:** November 18, 2025
**Status:** Ready to Execute

**Next Step:** Start with Phase 1, Day 1 - Initialize Next.js Project
