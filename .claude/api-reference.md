# API Reference

Complete API route specifications for the Warehouse Supply Chain Management System.

---

## API Structure Overview

```
/api
├── /auth                # Authentication endpoints
├── /orders              # Order management
├── /products            # Product CRUD
├── /inventory           # Inventory management
├── /distributors        # Distributor management
├── /clients             # Client management
├── /payments            # Payment operations
├── /mpesa               # M-Pesa integration
├── /reports             # Analytics and reports
└── /email               # Email notifications
```

**Base URL:** `https://yourdomain.com/api`
**Authentication:** JWT tokens via Supabase Auth (sent in Authorization header)

---

## Authentication Endpoints

### POST /api/auth/signup

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "254712345678",
  "role": "DISTRIBUTOR"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "DISTRIBUTOR"
  },
  "message": "User created successfully. Check email for verification link."
}
```

**Errors:**
- 400: Invalid input, email already exists
- 500: Server error

**Notes:**
- Uses Supabase Auth magic link
- Role determines dashboard access
- Email verification required

---

### POST /api/auth/login

Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Magic link sent to your email"
}
```

**Errors:**
- 404: User not found
- 500: Server error

**Notes:**
- Passwordless authentication
- Magic link expires in 1 hour
- Also supports Google OAuth (handled by Supabase)

---

## Order Endpoints

### GET /api/orders

Get all orders (filtered by user role).

**Query Parameters:**
- `status` (optional): PENDING | PROCESSING | FULFILLED | CANCELLED
- `paymentStatus` (optional): UNPAID | PENDING | PAID | FAILED
- `distributorId` (optional): Filter by distributor (Manager only)
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Response (200):**
```json
{
  "orders": [
    {
      "id": "uuid",
      "orderNumber": "ORD-2025-001",
      "orderType": "WAREHOUSE_TO_DISTRIBUTOR",
      "status": "PENDING",
      "totalAmount": "1500.00",
      "paymentStatus": "PAID",
      "createdAt": "2025-11-18T10:30:00Z",
      "distributor": {
        "id": "uuid",
        "businessName": "Acme Distributors"
      },
      "items": [
        {
          "productId": "uuid",
          "productName": "Coca Cola",
          "quantity": 50,
          "unitPrice": "30.00",
          "subtotal": "1500.00"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Authorization:**
- Owner/Manager: See all warehouse orders
- Distributor: See own orders (to warehouse + from clients)
- Client: See own orders

**Errors:**
- 401: Unauthorized
- 403: Forbidden (wrong role)
- 500: Server error

---

### POST /api/orders

Create a new order.

**Request Body:**
```json
{
  "orderType": "WAREHOUSE_TO_DISTRIBUTOR",
  "items": [
    {
      "productId": "uuid",
      "quantity": 50
    }
  ],
  "notes": "Urgent delivery needed"
}
```

**Response (201):**
```json
{
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-2025-001",
    "orderType": "WAREHOUSE_TO_DISTRIBUTOR",
    "status": "PENDING",
    "totalAmount": "1500.00",
    "paymentStatus": "UNPAID",
    "createdAt": "2025-11-18T10:30:00Z",
    "items": [...]
  },
  "message": "Order created successfully"
}
```

**Business Logic:**
1. Validate product availability
2. Calculate total amount (quantity × unitPrice)
3. Generate unique order number
4. Create order with status PENDING
5. Create order items
6. If WAREHOUSE_TO_DISTRIBUTOR:
   - Create payment record (status: UNPAID)
   - Return payment URL for M-Pesa
7. Send email notification

**Errors:**
- 400: Invalid input, insufficient stock
- 401: Unauthorized
- 500: Server error

---

### GET /api/orders/[id]

Get order details by ID.

**Response (200):**
```json
{
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-2025-001",
    "orderType": "WAREHOUSE_TO_DISTRIBUTOR",
    "status": "FULFILLED",
    "totalAmount": "1500.00",
    "paymentStatus": "PAID",
    "createdAt": "2025-11-18T10:30:00Z",
    "fulfilledAt": "2025-11-19T14:20:00Z",
    "distributor": {
      "businessName": "Acme Distributors",
      "phoneNumber": "254712345678"
    },
    "items": [
      {
        "productId": "uuid",
        "productName": "Coca Cola",
        "flavor": "Original",
        "quantity": 50,
        "unitPrice": "30.00",
        "subtotal": "1500.00"
      }
    ],
    "payment": {
      "id": "uuid",
      "status": "PAID",
      "mpesaReceiptNumber": "QGX1234567",
      "paidAt": "2025-11-18T10:35:00Z"
    }
  }
}
```

**Authorization:**
- Owner/Manager: All orders
- Distributor: Own orders
- Client: Own orders

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 404: Order not found
- 500: Server error

---

### PATCH /api/orders/[id]

Update order status.

**Request Body:**
```json
{
  "status": "PROCESSING",
  "notes": "Preparing items for shipment"
}
```

**Response (200):**
```json
{
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-2025-001",
    "status": "PROCESSING",
    "updatedAt": "2025-11-18T11:00:00Z"
  },
  "message": "Order updated successfully"
}
```

**Authorization:**
- Manager: Update WAREHOUSE_TO_DISTRIBUTOR orders
- Distributor: Update DISTRIBUTOR_TO_CLIENT orders

**Errors:**
- 400: Invalid status transition
- 401: Unauthorized
- 403: Forbidden
- 404: Order not found
- 500: Server error

---

### POST /api/orders/[id]/fulfill

Mark order as fulfilled.

**Request Body:**
```json
{
  "notes": "All items packed and ready"
}
```

**Response (200):**
```json
{
  "order": {
    "id": "uuid",
    "status": "FULFILLED",
    "fulfilledAt": "2025-11-19T14:20:00Z"
  },
  "message": "Order fulfilled successfully"
}
```

**Business Logic:**
1. Verify order is in PROCESSING status
2. Verify payment is PAID (for WAREHOUSE_TO_DISTRIBUTOR)
3. Update order status to FULFILLED
4. Set fulfilledAt timestamp
5. **Deduct from inventory:**
   - WAREHOUSE_TO_DISTRIBUTOR: Reduce WarehouseInventory
   - DISTRIBUTOR_TO_CLIENT: Reduce DistributorInventory
6. Create InventoryTransaction records (type: ORDER_FULFILLED)
7. Send email notification (distributor or client)

**Authorization:**
- Manager: Fulfill warehouse orders
- Distributor: Fulfill client orders

**Errors:**
- 400: Invalid order status, unpaid order
- 401: Unauthorized
- 403: Forbidden
- 404: Order not found
- 500: Server error, inventory update failed

---

### POST /api/orders/[id]/received

Mark order as received (Distributor only).

**Request Body:**
```json
{
  "notes": "All items received in good condition"
}
```

**Response (200):**
```json
{
  "message": "Order marked as received. Inventory updated."
}
```

**Business Logic:**
1. Verify order is FULFILLED
2. Verify user is the distributor for this order
3. **Add to distributor inventory:**
   - For each order item:
     - Create or update DistributorInventory
     - Add quantity
4. Create InventoryTransaction records (type: ORDER_RECEIVED)
5. Send email notification to manager

**Authorization:**
- Distributor only (for own orders)

**Errors:**
- 400: Order not fulfilled yet
- 401: Unauthorized
- 403: Forbidden (not your order)
- 404: Order not found
- 500: Server error

---

### DELETE /api/orders/[id]

Cancel an order.

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Response (200):**
```json
{
  "message": "Order cancelled successfully"
}
```

**Business Logic:**
1. Verify order is PENDING or PROCESSING (cannot cancel FULFILLED)
2. Update status to CANCELLED
3. If payment was PAID, initiate refund process (manual for now)
4. Add cancellation reason to notes
5. Send email notification

**Authorization:**
- Manager: Cancel warehouse orders
- Distributor: Cancel own orders (before fulfillment)

**Errors:**
- 400: Cannot cancel fulfilled orders
- 401: Unauthorized
- 403: Forbidden
- 404: Order not found
- 500: Server error

---

## Product Endpoints

### GET /api/products

Get all products.

**Query Parameters:**
- `isActive` (optional, default: true): Filter by active status
- `category` (optional): Filter by category
- `search` (optional): Search by name or flavor
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response (200):**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Coca Cola",
      "flavor": "Original",
      "category": "Carbonated Drinks",
      "sku": "CC-001",
      "unitPrice": "30.00",
      "imageUrl": "https://...",
      "isActive": true,
      "warehouseInventory": {
        "quantity": 500,
        "reorderLevel": 50
      }
    }
  ],
  "pagination": {...}
}
```

**Authorization:**
- Manager: See all products with warehouse inventory
- Distributor: See active products only
- Client: See active products with distributor's stock

**Errors:**
- 401: Unauthorized
- 500: Server error

---

### POST /api/products

Create a new product (Manager only).

**Request Body:**
```json
{
  "name": "Coca Cola",
  "flavor": "Original",
  "category": "Carbonated Drinks",
  "sku": "CC-001",
  "unitPrice": 30.00,
  "initialStock": 100,
  "reorderLevel": 50,
  "imageUrl": "https://..."
}
```

**Response (201):**
```json
{
  "product": {
    "id": "uuid",
    "name": "Coca Cola",
    "sku": "CC-001",
    "unitPrice": "30.00",
    "createdAt": "2025-11-18T10:00:00Z"
  },
  "inventory": {
    "quantity": 100,
    "reorderLevel": 50
  },
  "message": "Product created successfully"
}
```

**Business Logic:**
1. Validate SKU is unique
2. Create product record
3. Create WarehouseInventory record with initialStock
4. Create InventoryTransaction (type: RESTOCK) for initial stock

**Authorization:**
- Manager or Owner only

**Errors:**
- 400: Invalid input, SKU already exists
- 401: Unauthorized
- 403: Forbidden (wrong role)
- 500: Server error

---

### PATCH /api/products/[id]

Update product details (Manager only).

**Request Body:**
```json
{
  "name": "Coca Cola Zero",
  "flavor": "Zero Sugar",
  "unitPrice": 32.00,
  "reorderLevel": 60,
  "imageUrl": "https://..."
}
```

**Response (200):**
```json
{
  "product": {...},
  "message": "Product updated successfully"
}
```

**Notes:**
- Cannot change SKU after creation
- Price changes don't affect existing orders
- Only update isActive, name, flavor, category, unitPrice, imageUrl

**Authorization:**
- Manager or Owner only

**Errors:**
- 400: Invalid input
- 401: Unauthorized
- 403: Forbidden
- 404: Product not found
- 500: Server error

---

### DELETE /api/products/[id]

Deactivate a product (soft delete).

**Response (200):**
```json
{
  "message": "Product deactivated successfully"
}
```

**Business Logic:**
1. Set isActive = false
2. Product hidden from distributor/client catalogs
3. Historical orders still show this product

**Authorization:**
- Manager or Owner only

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 404: Product not found
- 500: Server error

---

## Inventory Endpoints

### GET /api/inventory/warehouse

Get warehouse inventory (Manager only).

**Query Parameters:**
- `lowStock` (optional): true | false (filter by quantity < reorderLevel)
- `productId` (optional): Filter by specific product
- `category` (optional): Filter by product category

**Response (200):**
```json
{
  "inventory": [
    {
      "id": "uuid",
      "productId": "uuid",
      "product": {
        "name": "Coca Cola",
        "flavor": "Original",
        "sku": "CC-001"
      },
      "quantity": 500,
      "reorderLevel": 50,
      "lastRestockedAt": "2025-11-15T10:00:00Z",
      "isLowStock": false
    }
  ]
}
```

**Authorization:**
- Manager or Owner only

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### GET /api/inventory/distributor

Get distributor inventory.

**Query Parameters:**
- `distributorId` (optional): Specific distributor (Manager only)
- `lowStock` (optional): Filter by low stock

**Response (200):**
```json
{
  "inventory": [
    {
      "id": "uuid",
      "productId": "uuid",
      "product": {
        "name": "Coca Cola",
        "flavor": "Original"
      },
      "quantity": 150,
      "updatedAt": "2025-11-18T14:00:00Z"
    }
  ]
}
```

**Authorization:**
- Distributor: See own inventory
- Manager: See all distributor inventories

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### POST /api/inventory/restock

Restock warehouse inventory (Manager only).

**Request Body:**
```json
{
  "productId": "uuid",
  "quantity": 200,
  "notes": "Shipment from Supplier ABC, Batch #123"
}
```

**Response (200):**
```json
{
  "inventory": {
    "productId": "uuid",
    "quantity": 700,
    "lastRestockedAt": "2025-11-18T10:00:00Z"
  },
  "transaction": {
    "id": "uuid",
    "transactionType": "RESTOCK",
    "quantityChange": 200,
    "balanceAfter": 700
  },
  "message": "Inventory restocked successfully"
}
```

**Business Logic:**
1. Validate product exists
2. Update WarehouseInventory (add quantity)
3. Set lastRestockedAt to now
4. Create InventoryTransaction (type: RESTOCK)
5. If quantity was below reorderLevel, send email alert to owner

**Authorization:**
- Manager only

**Errors:**
- 400: Invalid quantity (must be positive)
- 401: Unauthorized
- 403: Forbidden
- 404: Product not found
- 500: Server error

---

### POST /api/inventory/adjust

Manually adjust inventory (Manager only).

**Request Body:**
```json
{
  "inventoryType": "warehouse",
  "productId": "uuid",
  "quantityChange": -10,
  "notes": "Damaged goods - 10 units discarded"
}
```

**Response (200):**
```json
{
  "inventory": {
    "quantity": 490
  },
  "transaction": {
    "transactionType": "ADJUSTMENT",
    "quantityChange": -10,
    "balanceAfter": 490
  },
  "message": "Inventory adjusted successfully"
}
```

**Business Logic:**
1. Validate notes are provided (required for audit)
2. Update inventory (add or subtract quantityChange)
3. Create InventoryTransaction (type: ADJUSTMENT)
4. Ensure quantity doesn't go below 0

**Authorization:**
- Manager only

**Errors:**
- 400: Invalid input, notes required, quantity cannot be negative
- 401: Unauthorized
- 403: Forbidden
- 404: Inventory not found
- 500: Server error

---

## Distributor Endpoints

### GET /api/distributors

Get all distributors (Manager only).

**Query Parameters:**
- `isActive` (optional, default: true)
- `search` (optional): Search by business name or phone

**Response (200):**
```json
{
  "distributors": [
    {
      "id": "uuid",
      "userId": "uuid",
      "user": {
        "email": "dist@example.com",
        "fullName": "John Doe"
      },
      "businessName": "Acme Distributors",
      "phoneNumber": "254712345678",
      "isActive": true,
      "createdAt": "2025-11-01T10:00:00Z",
      "stats": {
        "totalOrders": 45,
        "totalRevenue": "67500.00",
        "activeClients": 12
      }
    }
  ]
}
```

**Authorization:**
- Manager or Owner only

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### POST /api/distributors

Add a new distributor (Manager only).

**Request Body:**
```json
{
  "email": "newdist@example.com",
  "businessName": "New Distributors Ltd",
  "phoneNumber": "254712345678",
  "fullName": "Jane Smith"
}
```

**Response (201):**
```json
{
  "distributor": {
    "id": "uuid",
    "businessName": "New Distributors Ltd",
    "userId": "uuid"
  },
  "message": "Distributor added. Invitation email sent."
}
```

**Business Logic:**
1. Check if user already exists (by email)
2. If new user:
   - Create User (role: DISTRIBUTOR)
   - Send magic link invitation email
3. Create Distributor record
4. Create WarehouseDistributor link (warehouseId, distributorId)

**Authorization:**
- Manager only

**Errors:**
- 400: Invalid input, email already exists
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### GET /api/distributors/[id]

Get distributor details.

**Response (200):**
```json
{
  "distributor": {
    "id": "uuid",
    "businessName": "Acme Distributors",
    "phoneNumber": "254712345678",
    "user": {
      "email": "dist@example.com",
      "fullName": "John Doe"
    },
    "isActive": true,
    "clients": [
      {
        "id": "uuid",
        "businessName": "Client Shop A",
        "isActive": true
      }
    ],
    "inventory": [
      {
        "productId": "uuid",
        "product": { "name": "Coca Cola" },
        "quantity": 150
      }
    ],
    "orderHistory": [...]
  }
}
```

**Authorization:**
- Manager: All distributors
- Distributor: Own details

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 404: Distributor not found
- 500: Server error

---

### PATCH /api/distributors/[id]

Update distributor details.

**Request Body:**
```json
{
  "businessName": "Acme Distributors Ltd",
  "phoneNumber": "254712345679"
}
```

**Response (200):**
```json
{
  "distributor": {...},
  "message": "Distributor updated successfully"
}
```

**Authorization:**
- Manager: Update any distributor
- Distributor: Update own details

**Errors:**
- 400: Invalid input
- 401: Unauthorized
- 403: Forbidden
- 404: Distributor not found
- 500: Server error

---

### DELETE /api/distributors/[id]

Remove distributor (Manager only).

**Request Body:**
```json
{
  "reassignClientsTo": "uuid-of-new-distributor"
}
```

**Response (200):**
```json
{
  "message": "Distributor removed. 12 clients reassigned.",
  "reassignedClients": 12
}
```

**Business Logic:**
1. Mark distributor isActive = false
2. Get all clients assigned to this distributor
3. If reassignClientsTo provided:
   - Update all clients with new distributorId
   - Send email notification to clients
4. Else:
   - Return list of orphaned clients for manual reassignment
5. Set removedAt timestamp in WarehouseDistributor

**Authorization:**
- Manager only

**Errors:**
- 400: Invalid input, target distributor not found
- 401: Unauthorized
- 403: Forbidden
- 404: Distributor not found
- 500: Server error

---

## Client Endpoints

### GET /api/clients

Get all clients.

**Query Parameters:**
- `distributorId` (optional): Filter by distributor (Manager only)
- `isActive` (optional, default: true)
- `search` (optional): Search by business name

**Response (200):**
```json
{
  "clients": [
    {
      "id": "uuid",
      "userId": "uuid",
      "user": {
        "email": "client@example.com",
        "fullName": "Alice Brown"
      },
      "businessName": "Corner Shop",
      "phoneNumber": "254722334455",
      "location": "Nairobi, Kenya",
      "distributorId": "uuid",
      "distributor": {
        "businessName": "Acme Distributors"
      },
      "isActive": true
    }
  ]
}
```

**Authorization:**
- Manager: All clients
- Distributor: Own clients

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### POST /api/clients

Add a new client (Distributor only).

**Request Body:**
```json
{
  "email": "newclient@example.com",
  "fullName": "Bob Johnson",
  "businessName": "Bob's Store",
  "phoneNumber": "254733445566",
  "location": "Mombasa, Kenya"
}
```

**Response (201):**
```json
{
  "client": {
    "id": "uuid",
    "businessName": "Bob's Store",
    "userId": "uuid"
  },
  "message": "Client added. Invitation email sent."
}
```

**Business Logic:**
1. Check if user already exists
2. If new user:
   - Create User (role: CLIENT)
   - Send magic link invitation email
3. Create Client record (distributorId = current user's distributor)

**Authorization:**
- Distributor only

**Errors:**
- 400: Invalid input, email already exists
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### POST /api/clients/bulk-reassign

Bulk reassign clients to new distributor (Manager only).

**Request Body:**
```json
{
  "clientIds": ["uuid1", "uuid2", "uuid3"],
  "newDistributorId": "uuid"
}
```

**Response (200):**
```json
{
  "message": "3 clients reassigned successfully",
  "reassignedCount": 3
}
```

**Business Logic:**
1. Validate all clientIds exist
2. Validate newDistributorId exists and is active
3. Update distributorId for all clients
4. Send email notification to each client (new distributor contact info)

**Authorization:**
- Manager only

**Errors:**
- 400: Invalid input, distributor not found
- 401: Unauthorized
- 403: Forbidden
- 404: Clients not found
- 500: Server error

---

## Payment Endpoints

### GET /api/payments

Get all payments.

**Query Parameters:**
- `orderId` (optional): Filter by order
- `status` (optional): Filter by payment status
- `distributorId` (optional): Filter by distributor (Manager only)
- `startDate` (optional)
- `endDate` (optional)

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "order": {
        "orderNumber": "ORD-2025-001",
        "totalAmount": "1500.00"
      },
      "amount": "1500.00",
      "paymentMethod": "M-PESA",
      "mpesaPhoneNumber": "254712345678",
      "mpesaTransactionId": "QGX1234567",
      "mpesaReceiptNumber": "QGX1234567",
      "status": "PAID",
      "paidAt": "2025-11-18T10:35:00Z"
    }
  ]
}
```

**Authorization:**
- Manager/Owner: All payments
- Distributor: Own payments

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### GET /api/payments/[id]

Get payment details.

**Response (200):**
```json
{
  "payment": {
    "id": "uuid",
    "orderId": "uuid",
    "amount": "1500.00",
    "status": "PAID",
    "mpesaReceiptNumber": "QGX1234567",
    "paidAt": "2025-11-18T10:35:00Z",
    "order": {...}
  }
}
```

**Authorization:**
- Manager/Owner: All payments
- Distributor: Own payments

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 404: Payment not found
- 500: Server error

---

### PATCH /api/payments/[id]

Manually update payment status (Manager only).

**Request Body:**
```json
{
  "status": "PAID",
  "notes": "Payment verified via bank transfer"
}
```

**Response (200):**
```json
{
  "payment": {
    "id": "uuid",
    "status": "PAID",
    "updatedAt": "2025-11-18T11:00:00Z"
  },
  "message": "Payment status updated"
}
```

**Use Case:**
- Manual verification for failed M-Pesa payments
- Alternative payment methods (bank transfer)

**Authorization:**
- Manager only

**Errors:**
- 400: Invalid status
- 401: Unauthorized
- 403: Forbidden
- 404: Payment not found
- 500: Server error

---

## M-Pesa Endpoints

### POST /api/mpesa/stk-push

Initiate M-Pesa STK Push payment.

**Request Body:**
```json
{
  "orderId": "uuid",
  "phoneNumber": "254712345678",
  "amount": 1500.00
}
```

**Response (200):**
```json
{
  "CheckoutRequestID": "ws_CO_18112025103000123456",
  "MerchantRequestID": "29115-34620561-1",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

**Business Logic:**
1. Validate order exists and is unpaid
2. Validate phone number format (254XXXXXXXXX)
3. Get M-Pesa access token
4. Call M-Pesa Lipa Na M-Pesa Online API
5. Update Payment record:
   - mpesaPhoneNumber
   - mpesaTransactionId = CheckoutRequestID
   - status = PENDING
6. Return CheckoutRequestID for polling (optional)

**Authorization:**
- Distributor only (for own orders)

**Errors:**
- 400: Invalid input, order already paid
- 401: Unauthorized
- 403: Forbidden
- 404: Order not found
- 500: M-Pesa API error

**See:** `.claude/mpesa-integration.md` for detailed implementation

---

### POST /api/mpesa/callback

M-Pesa payment callback (webhook).

**Request Body (from M-Pesa):**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_18112025103000123456",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {"Name": "Amount", "Value": 1500},
          {"Name": "MpesaReceiptNumber", "Value": "QGX1234567"},
          {"Name": "TransactionDate", "Value": 20251118103500},
          {"Name": "PhoneNumber", "Value": 254712345678}
        ]
      }
    }
  }
}
```

**Response (200):**
```json
{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}
```

**Business Logic:**
1. Verify callback source (IP whitelist or signature)
2. Extract CheckoutRequestID
3. Find Payment record by mpesaTransactionId
4. If ResultCode == 0 (success):
   - Update Payment: status = PAID, mpesaReceiptNumber, paidAt
   - Update Order: paymentStatus = PAID
   - Send email confirmation
5. Else (failed):
   - Update Payment: status = FAILED
   - Update Order: paymentStatus = FAILED
   - Send failure email with retry link

**Authorization:**
- Public endpoint (secured by IP/signature validation)

**Errors:**
- 400: Invalid callback format
- 404: Payment not found
- 500: Server error

**See:** `.claude/mpesa-integration.md` for security details

---

### POST /api/mpesa/query

Query M-Pesa payment status (fallback if callback delayed).

**Request Body:**
```json
{
  "checkoutRequestId": "ws_CO_18112025103000123456"
}
```

**Response (200):**
```json
{
  "ResponseCode": "0",
  "ResponseDescription": "The service request has been accepted successfully",
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_18112025103000123456",
  "ResultCode": "0",
  "ResultDesc": "The service request is processed successfully."
}
```

**Business Logic:**
1. Call M-Pesa Query Request Status API
2. Update payment status based on response
3. Return current status

**Authorization:**
- Distributor only (for own payments)

**Errors:**
- 400: Invalid checkoutRequestId
- 401: Unauthorized
- 404: Payment not found
- 500: M-Pesa API error

---

## Report Endpoints

### GET /api/reports/revenue

Get revenue analytics (Owner/Manager only).

**Query Parameters:**
- `period`: month | quarter | year
- `startDate` (optional)
- `endDate` (optional)
- `groupBy` (optional): distributor | product | category

**Response (200):**
```json
{
  "totalRevenue": "125000.00",
  "previousPeriodRevenue": "98000.00",
  "growthPercentage": 27.55,
  "revenueByMonth": [
    {
      "month": "2025-01",
      "revenue": "45000.00"
    },
    {
      "month": "2025-02",
      "revenue": "52000.00"
    }
  ],
  "revenueByDistributor": [
    {
      "distributorId": "uuid",
      "businessName": "Acme Distributors",
      "revenue": "67500.00",
      "orderCount": 45
    }
  ]
}
```

**Authorization:**
- Owner or Manager only

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### GET /api/reports/inventory-turnover

Get inventory turnover analysis.

**Query Parameters:**
- `period`: 30 | 60 | 90 (days)

**Response (200):**
```json
{
  "highTurnover": [
    {
      "productId": "uuid",
      "productName": "Coca Cola",
      "unitsSold": 5000,
      "turnoverRate": 8.5,
      "revenue": "150000.00"
    }
  ],
  "lowTurnover": [
    {
      "productId": "uuid",
      "productName": "Rare Flavor",
      "unitsSold": 50,
      "turnoverRate": 0.2,
      "revenue": "1500.00"
    }
  ],
  "lowStockProducts": [...]
}
```

**Authorization:**
- Owner or Manager only

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

### GET /api/reports/distributor-performance

Get distributor performance metrics.

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)
- `sortBy` (optional): revenue | orderCount | avgOrderValue

**Response (200):**
```json
{
  "distributors": [
    {
      "distributorId": "uuid",
      "businessName": "Acme Distributors",
      "totalOrders": 45,
      "totalRevenue": "67500.00",
      "avgOrderValue": "1500.00",
      "avgFulfillmentTime": 2.5,
      "activeClients": 12
    }
  ]
}
```

**Authorization:**
- Owner or Manager only

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 500: Server error

---

## Email Endpoint

### POST /api/email/send

Send email notification (internal use).

**Request Body:**
```json
{
  "to": "user@example.com",
  "template": "order-confirmation",
  "data": {
    "orderNumber": "ORD-2025-001",
    "totalAmount": "1500.00",
    "items": [...]
  }
}
```

**Response (200):**
```json
{
  "message": "Email sent successfully",
  "emailId": "uuid"
}
```

**Available Templates:**
- order-confirmation
- order-fulfilled
- payment-confirmed
- payment-failed
- low-stock-alert
- distributor-changed

**Authorization:**
- Internal API calls only (not exposed publicly)
- Requires API key in header

**Errors:**
- 400: Invalid template
- 500: Email service error

---

## Error Response Format

All API endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error message"
  }
}
```

**Common Error Codes:**
- `AUTH_REQUIRED`: 401, authentication required
- `FORBIDDEN`: 403, insufficient permissions
- `NOT_FOUND`: 404, resource not found
- `VALIDATION_ERROR`: 400, input validation failed
- `PAYMENT_FAILED`: 400, M-Pesa payment failed
- `INSUFFICIENT_STOCK`: 400, not enough inventory
- `INVALID_ORDER_STATUS`: 400, cannot perform action in current status
- `SERVER_ERROR`: 500, internal server error

---

## Authentication Flow

All protected endpoints require:

**Header:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Token Source:**
- Obtained from Supabase Auth after login
- Automatically refreshed by Supabase client
- Expires after 1 hour (refresh token valid for 30 days)

**Middleware Checks:**
1. Verify token signature
2. Check token expiration
3. Extract user ID and role
4. Attach user info to request
5. Proceed to route handler

---

## Rate Limiting

**Recommended Limits:**
- M-Pesa endpoints: 10 requests/minute per user
- General API: 100 requests/minute per user
- Public endpoints: 20 requests/minute per IP

**Implementation:**
- Use Vercel Edge Config or Upstash Redis
- Return 429 Too Many Requests when exceeded
- Include Retry-After header

---

## API Versioning

**Current Version:** v1 (no version prefix for now)

**Future Versioning:**
- When breaking changes needed, use `/api/v2/...`
- Maintain v1 for backward compatibility
- Document migration guide

---

## Testing

**Recommended Tools:**
- **Postman/Insomnia:** Manual API testing
- **Vitest/Jest:** Unit tests for API routes
- **Playwright:** E2E tests

**Test Coverage:**
- All happy paths (successful requests)
- Error scenarios (validation, auth, permissions)
- Edge cases (concurrent requests, race conditions)
- M-Pesa callback handling (mock webhook)

---

## Documentation

**OpenAPI/Swagger:**
- Generate OpenAPI spec from route handlers
- Host at `/api/docs`
- Use Swagger UI for interactive docs

**Postman Collection:**
- Export Postman collection for all endpoints
- Include example requests/responses
- Share with team

---

**Version:** 1.0
**Last Updated:** November 18, 2025
**Status:** Ready for Implementation

**References:**
- Main TRD: `/TRD.md` (Section 9)
- M-Pesa Integration: `.claude/mpesa-integration.md`
- Database Schema: `.claude/database-schema.md`
