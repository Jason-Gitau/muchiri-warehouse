# System Overview - Muchiri Warehouse Management System

**For Non-Technical Stakeholders**

A simple guide to understanding what this system does and how it works.

**Last Updated:** 2025-11-18 | **Status:** Planning Phase

---

## 📋 Table of Contents

1. [What is This System?](#what-is-this-system)
2. [Who Uses It?](#who-uses-it)
3. [Key Features](#key-features)
4. [How It Works](#how-it-works)
5. [Business Value](#business-value)
6. [Getting Started](#getting-started)
7. [Support & Help](#support--help)

---

## What is This System?

**Muchiri Warehouse** is a web-based system that helps manage the entire supply chain for a warehouse selling canned sodas in Kenya. Think of it as a digital assistant that:

- ✅ **Tracks inventory** - Knows exactly how many products you have
- ✅ **Processes orders** - Handles orders from distributors and their clients
- ✅ **Accepts payments** - Integrates with M-Pesa for instant payment
- ✅ **Manages relationships** - Keeps track of distributors and their clients
- ✅ **Provides insights** - Shows sales reports and business analytics

**In simple terms:** It's like having a smart notebook that remembers everything about your warehouse, automatically updates inventory, processes payments, and tells you how your business is performing.

---

## Who Uses It?

The system has **four types of users**, each with different roles:

### 👔 Owner (Business Overseer)

**Who:** The warehouse owner who oversees everything
**What they see:** Business analytics and reports
**What they can do:**
- View total revenue and sales trends
- See which products sell the most
- Monitor distributor performance
- Check inventory turnover
- Review activity feed

**What they CANNOT do:**
- Change prices or inventory (read-only access)
- Process orders
- Add/remove users

**Think of it like:** A dashboard in your car - you can see speed, fuel, and engine status, but you can't change how the car works.

---

### 🏭 Manager (Day-to-Day Operations)

**Who:** The person running daily warehouse operations
**What they see:** Products, inventory, orders, distributors
**What they can do:**
- ✅ Add new products to the catalog
- ✅ Restock inventory when shipments arrive
- ✅ Process orders from distributors
- ✅ Verify M-Pesa payments
- ✅ Add or remove distributors
- ✅ Fulfill orders (pack and ship)

**Typical day:**
1. Check new orders from distributors
2. Verify payments received via M-Pesa
3. Prepare and fulfill orders
4. Restock inventory when low
5. Add new distributors when needed

**Think of it like:** A store manager who handles inventory, serves customers, and keeps things running smoothly.

---

### 🚚 Distributor (Wholesale Buyer & Retailer)

**Who:** Business owners who buy from the warehouse and sell to clients
**What they see:** Warehouse products, their own inventory, their clients
**What they can do:**
- ✅ Browse available products at the warehouse
- ✅ Place orders and pay via M-Pesa
- ✅ Track order status (pending, processing, delivered)
- ✅ Manage personal inventory
- ✅ Add clients (shops, stores that buy from them)
- ✅ Process orders from their clients
- ✅ Track client payments (manual)

**Typical journey:**
1. Check warehouse inventory
2. Add products to cart
3. Pay via M-Pesa (instant)
4. Wait for warehouse to fulfill order
5. Receive products, mark as received
6. Sell to their own clients
7. Fulfill client orders

**Think of it like:** A wholesaler who buys in bulk from the warehouse and distributes to smaller shops.

---

### 🏪 Client (End Customer)

**Who:** Shops, stores, or individuals buying from distributors
**What they see:** Products available from their distributor
**What they can do:**
- ✅ Browse product catalog
- ✅ Add items to cart
- ✅ Place orders
- ✅ Track order status
- ✅ View order history

**What they CANNOT do:**
- Change prices
- See warehouse inventory directly
- Contact other distributors

**Typical experience:**
1. Browse products
2. Add to cart
3. Place order
4. Pay distributor (outside the app - cash, bank transfer)
5. Receive products
6. Track delivery status

**Think of it like:** Shopping on an online store, but specific to your assigned distributor.

---

## Key Features

### 1. 📦 Product Catalog

**What it is:** A digital list of all products (canned sodas)

**Details stored:**
- Product name (e.g., "Coca Cola")
- Flavor (e.g., "Original", "Zero")
- Price
- Product code (SKU)
- Picture

**Who manages it:** Manager

**Business benefit:** Everyone sees the same, up-to-date product information.

---

### 2. 📊 Inventory Management

**What it is:** Real-time tracking of how many products you have

**Two levels:**
1. **Warehouse Inventory** - What the warehouse has
2. **Distributor Inventory** - What each distributor has

**How it updates:**
- **Warehouse:** Increases when manager restocks, decreases when orders fulfilled
- **Distributor:** Increases when they receive warehouse orders, decreases when they fulfill client orders

**Business benefit:** Always know exactly how much stock you have. No more guessing or manual counting.

**Example:**
```
Warehouse has 1,000 Coca Cola cans
↓ Distributor A orders 200 cans
Warehouse now has 800 cans
Distributor A now has 200 cans
↓ Client B orders 50 cans from Distributor A
Distributor A now has 150 cans
```

---

### 3. 💳 M-Pesa Payment Integration

**What it is:** Automatic payment processing using M-Pesa (Kenya's mobile money)

**How it works:**
1. Distributor places order
2. System sends payment request to their phone
3. Distributor enters M-Pesa PIN
4. Money transferred instantly
5. Order confirmed automatically

**Who uses it:** Only distributors paying the warehouse

**Business benefit:**
- ✅ Instant payment confirmation
- ✅ No manual payment verification
- ✅ Secure and trusted in Kenya
- ✅ Automatic receipts
- ✅ Less fraud risk

**Note:** Client payments (to distributors) are tracked manually. Clients pay distributors outside the app using cash or bank transfer.

---

### 4. 📋 Order Management

**What it is:** Complete tracking of all orders from placement to delivery

**Two types of orders:**

**Type 1: Distributor → Warehouse**
- Distributor places order
- Pays via M-Pesa
- Manager processes and fulfills
- Distributor receives and confirms
- Inventory updates automatically

**Type 2: Client → Distributor**
- Client places order
- Distributor marks payment manually
- Distributor fulfills order
- Client receives products
- Inventory updates automatically

**Order statuses:**
- **Pending** - Just placed, waiting for processing
- **Processing** - Being prepared
- **Fulfilled** - Completed and shipped
- **Cancelled** - Order was cancelled

**Business benefit:** Complete visibility of all orders. No lost orders, no confusion.

---

### 5. 📈 Analytics & Reports

**What it is:** Visual charts and reports showing business performance

**Reports available:**

**Revenue Trends**
- Monthly revenue for past 12 months
- Growth percentage
- Comparison to previous periods

**Top-Selling Products**
- Which flavors sell the most
- Revenue per product
- Units sold

**Distributor Performance**
- How much each distributor buys
- Number of orders
- Average order value
- Payment history

**Inventory Turnover**
- Which products move fast
- Which products are slow
- Low stock alerts

**Who sees it:** Owner (read-only), Manager (can act on insights)

**Business benefit:** Make informed decisions. Know what's working and what's not.

---

### 6. 📧 Email Notifications

**What it is:** Automatic emails sent when important events happen

**Examples:**

**For Managers/Owners:**
- "New order received from Acme Distributors"
- "Payment confirmed - Order #ORD-2025-001"
- "Low stock alert - Coca Cola Original below 50 units"

**For Distributors:**
- "Order confirmed - Order #ORD-2025-001"
- "Your order is ready for pickup"
- "Payment failed - Please try again"

**For Clients:**
- "Order received - Thank you for your order"
- "Order delivered - Enjoy your products"

**Business benefit:** Everyone stays informed without having to constantly check the system.

---

## How It Works

### The Supply Chain Flow

Think of it as a **three-level chain**:

```
┌─────────────────────────────────┐
│         WAREHOUSE               │
│  (Has products in stock)        │
│  Managed by: Owner & Manager    │
└────────────┬────────────────────┘
             │
             │ Distributor orders & pays via M-Pesa
             │ Manager fulfills order
             ↓
┌─────────────────────────────────┐
│        DISTRIBUTORS             │
│  (Buy from warehouse, sell      │
│   to clients)                   │
│  Managed by: Distributors       │
└────────────┬────────────────────┘
             │
             │ Client orders
             │ Distributor fulfills order
             ↓
┌─────────────────────────────────┐
│          CLIENTS                │
│  (End customers - shops,        │
│   stores, individuals)          │
│  Managed by: Clients themselves │
└─────────────────────────────────┘
```

### Example Journey: From Warehouse to Client

**Step 1: Distributor Orders from Warehouse**

1. Distributor logs into the system
2. Browses warehouse products
3. Adds 200 Coca Cola cans to cart
4. Proceeds to checkout
5. System calculates total: KES 6,000
6. Initiates M-Pesa payment
7. Payment prompt appears on distributor's phone
8. Distributor enters M-Pesa PIN
9. Payment confirmed instantly
10. Order created with status "Pending"

**Step 2: Manager Processes Order**

1. Manager sees new order notification
2. Reviews order details
3. Marks order as "Processing"
4. Prepares products for shipment
5. Marks order as "Fulfilled"
6. System automatically:
   - Reduces warehouse inventory by 200
   - Creates inventory transaction record
   - Sends email to distributor

**Step 3: Distributor Receives Order**

1. Distributor receives products
2. Marks order as "Received" in system
3. System automatically:
   - Adds 200 to distributor's inventory
   - Creates inventory transaction record
   - Sends confirmation email to manager

**Step 4: Client Orders from Distributor**

1. Client logs into system
2. Browses distributor's products
3. Adds 50 Coca Cola cans to cart
4. Places order
5. Order created (payment tracked manually)
6. Distributor receives email notification

**Step 5: Distributor Fulfills Client Order**

1. Distributor sees client's order
2. Client pays via cash/bank transfer (outside app)
3. Distributor marks payment as received
4. Prepares products
5. Marks order as "Fulfilled"
6. System automatically:
   - Reduces distributor inventory by 50
   - Creates inventory transaction record
   - Sends email to client

**Step 6: Client Receives Products**

1. Client receives products
2. Views order status as "Fulfilled"
3. Can see complete order history

### Inventory Synchronization

The system automatically keeps inventory accurate:

**When warehouse restocks:**
- +100 units → Warehouse inventory increases
- Transaction logged: "RESTOCK"

**When manager fulfills distributor order:**
- -200 units → Warehouse inventory decreases
- Transaction logged: "ORDER_FULFILLED"

**When distributor receives order:**
- +200 units → Distributor inventory increases
- Transaction logged: "ORDER_RECEIVED"

**When distributor fulfills client order:**
- -50 units → Distributor inventory decreases
- Transaction logged: "ORDER_FULFILLED"

**Business benefit:** Complete audit trail. You can see every single inventory change, who did it, and when.

---

## Business Value

### For the Warehouse Owner

✅ **Better Visibility**
- See real-time sales data
- Identify top-performing distributors
- Spot trends early

✅ **Reduced Manual Work**
- No more Excel spreadsheets
- No manual inventory counting
- Automated payment tracking

✅ **Faster Payments**
- M-Pesa payments instant
- No waiting for bank transfers
- Less payment disputes

✅ **Informed Decisions**
- Data-driven insights
- Know which products to stock more
- Identify underperforming items

**ROI (Return on Investment):**
- Less time spent on admin work = More time for growth
- Fewer errors = Less money lost
- Better insights = Better business decisions

---

### For Distributors

✅ **Easy Ordering**
- Browse products anytime
- Place orders 24/7
- Instant payment confirmation

✅ **Inventory Management**
- Know exactly what you have in stock
- Automatic updates
- Low stock warnings

✅ **Client Management**
- Keep track of all clients
- See client order history
- Track payments easily

✅ **Professional Image**
- Clients see organized catalog
- Email confirmations
- Professional ordering process

**Business benefit:** Spend less time managing, more time selling.

---

### For Clients

✅ **Convenience**
- Order anytime, anywhere
- See available products
- Track order status

✅ **Transparency**
- Know order status
- See complete order history
- Email notifications

✅ **Reliability**
- No forgotten orders
- Clear pricing
- Professional service

**Business benefit:** Better buying experience = More likely to order again.

---

## Current System Status

### ✅ What's Complete (Planning Phase)

- Complete technical planning
- Database structure designed
- Feature requirements documented
- Implementation roadmap created
- M-Pesa integration planned
- Security measures defined

### 🏗 What's Being Built (Not Started Yet)

**Phase 1: Foundation (Week 1-2)**
- Setting up the development environment
- Creating database
- Building login system

**Phase 2: Core Features (Week 3-5)**
- Product management
- Inventory tracking
- M-Pesa payment integration
- Order processing

**Phase 3: Distributor & Client (Week 6-7)**
- Distributor features
- Client features
- Complete order flow

**Phase 4: Analytics (Week 8)**
- Owner dashboard
- Reports and charts
- Performance metrics

**Phase 5: Notifications (Week 9)**
- Email service
- Automated notifications

**Phase 6-7: Testing & Launch (Week 10-11)**
- Testing everything
- Fixing bugs
- Deploying to production

### 📅 Timeline

- **Start Date:** To be determined
- **Expected Launch:** 11 weeks from start
- **Current Status:** Planning complete, ready to build

---

## Getting Started

### For Owners

1. **Review this document** - Understand what the system does
2. **Review analytics mock-ups** - See what reports you'll get
3. **Provide feedback** - Tell us what's important to you
4. **Wait for launch** - We'll notify you when ready

### For Managers

1. **Prepare product list** - Gather current inventory data
2. **List distributors** - Names, contacts, details
3. **Get M-Pesa credentials** - Register for Daraja API
4. **Plan training** - Time for learning the system

### For Distributors

1. **Prepare client list** - Names, contacts, locations
2. **Register M-Pesa** - Ensure you can receive M-Pesa
3. **Wait for invitation** - Manager will send signup link
4. **Attend training** - Learn how to use the system

### For Clients

1. **Wait for invitation** - Distributor will send signup link
2. **Have email ready** - For account creation
3. **Attend training** - Learn how to browse and order

---

## Support & Help

### Training Materials (Coming Soon)

- Video tutorials for each role
- Step-by-step guides
- FAQ document
- Practice environment

### Getting Help

**For technical issues:**
- Contact: [Support email to be defined]
- Hours: [To be defined]
- Response time: [To be defined]

**For business questions:**
- Contact: Jason Mbugua (Project Owner)
- Email: [To be defined]

**For feature requests:**
- Submit via: [To be defined]
- We review monthly

### FAQ (Frequently Asked Questions)

**Q: Do I need to install any software?**
A: No! It's a web application. Just use your browser (Chrome, Safari, Firefox).

**Q: Does it work on mobile phones?**
A: Yes! The system is fully mobile-responsive. Use on phone, tablet, or computer.

**Q: What if I don't have internet?**
A: You need internet to use the system. It's cloud-based for real-time updates.

**Q: Is my data safe?**
A: Yes. We use industry-standard security (Supabase, HTTPS encryption, secure authentication).

**Q: Can I export my data?**
A: Yes. Reports can be exported to PDF/Excel (feature planned).

**Q: What if M-Pesa payment fails?**
A: You'll get an error message and can retry immediately. All transactions are logged.

**Q: Can I have multiple roles?**
A: No. Each user account has one role. If you need multiple roles, create separate accounts.

**Q: How much does it cost?**
A: [Pricing to be defined]

---

## Glossary (Simple Terms)

- **Dashboard** - The main screen you see when you log in
- **Inventory** - The products you have in stock
- **Order** - A request to buy products
- **Fulfill** - Complete an order (pack and ship)
- **M-Pesa** - Kenya's mobile money service (like sending money via phone)
- **STK Push** - The payment prompt that appears on your phone
- **SKU** - Product code (like a barcode number)
- **Distributor** - Someone who buys from warehouse and sells to shops
- **Client** - End customer who buys from distributor
- **Transaction** - Any action that changes inventory (restock, order, etc.)

---

## Feedback & Suggestions

We want to build a system that works for YOU!

**Tell us:**
- What features are most important?
- What's confusing?
- What's missing?
- What would make your work easier?

**Contact:** [To be defined]

---

**Summary:** This system helps you manage your entire warehouse supply chain in one place - from tracking inventory to processing M-Pesa payments to analyzing sales. It saves time, reduces errors, and gives you the insights you need to grow your business.

**Questions?** Contact the project owner or check the FAQ above.

---

**Last Updated:** 2025-11-18
**Version:** 1.0 (Planning Phase)
**Next Update:** After implementation begins

**This document will be updated regularly as the system is built and launched.**
