-- =====================================================
-- Muchiri Warehouse Supply Chain Management System
-- Initial Database Schema Migration
-- =====================================================
-- Migration: 001_initial_schema
-- Created: 2025-11-18
-- Description: Initial database setup with all tables, enums, indexes, and constraints
-- =====================================================

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

-- User roles enum
CREATE TYPE "UserRole" AS ENUM (
  'OWNER',
  'MANAGER',
  'DISTRIBUTOR',
  'CLIENT'
);

-- Order type enum
CREATE TYPE "OrderType" AS ENUM (
  'WAREHOUSE_TO_DISTRIBUTOR',
  'DISTRIBUTOR_TO_CLIENT'
);

-- Order status enum
CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'FULFILLED',
  'CANCELLED'
);

-- Payment status enum
CREATE TYPE "PaymentStatus" AS ENUM (
  'UNPAID',
  'PENDING',
  'PAID',
  'FAILED'
);

-- Transaction type enum
CREATE TYPE "TransactionType" AS ENUM (
  'RESTOCK',
  'ORDER_FULFILLED',
  'ORDER_RECEIVED',
  'ADJUSTMENT'
);

-- =====================================================
-- 2. CREATE TABLES (in dependency order)
-- =====================================================

-- -----------------------------------------------------
-- Table: User
-- Description: All system users (owners, managers, distributors, clients)
-- -----------------------------------------------------
CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "phoneNumber" TEXT,
  "role" "UserRole" NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for User table
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

-- -----------------------------------------------------
-- Table: Warehouse
-- Description: Warehouse information (single warehouse in Phase 1)
-- -----------------------------------------------------
CREATE TABLE "Warehouse" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for Warehouse table
CREATE INDEX "Warehouse_ownerId_idx" ON "Warehouse"("ownerId");

-- -----------------------------------------------------
-- Table: WarehouseManager
-- Description: Maps managers to warehouses
-- -----------------------------------------------------
CREATE TABLE "WarehouseManager" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "warehouseId" TEXT NOT NULL,
  "managerId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "WarehouseManager_warehouseId_managerId_key" UNIQUE ("warehouseId", "managerId")
);

-- Create indexes for WarehouseManager table
CREATE INDEX "WarehouseManager_warehouseId_idx" ON "WarehouseManager"("warehouseId");
CREATE INDEX "WarehouseManager_managerId_idx" ON "WarehouseManager"("managerId");

-- -----------------------------------------------------
-- Table: Product
-- Description: Canned soda products
-- -----------------------------------------------------
CREATE TABLE "Product" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "flavor" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "sku" TEXT NOT NULL UNIQUE,
  "unitPrice" DECIMAL(10, 2) NOT NULL,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for Product table
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- -----------------------------------------------------
-- Table: WarehouseInventory
-- Description: Inventory levels at the warehouse
-- -----------------------------------------------------
CREATE TABLE "WarehouseInventory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "warehouseId" TEXT NOT NULL,
  "productId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reorderLevel" INTEGER NOT NULL DEFAULT 50,
  "lastRestockedAt" TIMESTAMP WITH TIME ZONE,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "WarehouseInventory_warehouseId_productId_key" UNIQUE ("warehouseId", "productId"),
  CONSTRAINT "WarehouseInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for WarehouseInventory table
CREATE INDEX "WarehouseInventory_warehouseId_idx" ON "WarehouseInventory"("warehouseId");
CREATE INDEX "WarehouseInventory_productId_idx" ON "WarehouseInventory"("productId");

-- -----------------------------------------------------
-- Table: Distributor
-- Description: Distributor business information
-- -----------------------------------------------------
CREATE TABLE "Distributor" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "businessName" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for Distributor table
CREATE INDEX "Distributor_userId_idx" ON "Distributor"("userId");
CREATE INDEX "Distributor_isActive_idx" ON "Distributor"("isActive");

-- -----------------------------------------------------
-- Table: WarehouseDistributor
-- Description: Maps distributors to warehouses
-- -----------------------------------------------------
CREATE TABLE "WarehouseDistributor" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "warehouseId" TEXT NOT NULL,
  "distributorId" TEXT NOT NULL,
  "addedByManagerId" TEXT NOT NULL,
  "addedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "removedAt" TIMESTAMP WITH TIME ZONE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "WarehouseDistributor_warehouseId_distributorId_key" UNIQUE ("warehouseId", "distributorId")
);

-- Create indexes for WarehouseDistributor table
CREATE INDEX "WarehouseDistributor_warehouseId_idx" ON "WarehouseDistributor"("warehouseId");
CREATE INDEX "WarehouseDistributor_distributorId_idx" ON "WarehouseDistributor"("distributorId");

-- -----------------------------------------------------
-- Table: Client
-- Description: Client business information
-- -----------------------------------------------------
CREATE TABLE "Client" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "distributorId" TEXT NOT NULL,
  "businessName" TEXT,
  "phoneNumber" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "addedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for Client table
CREATE INDEX "Client_userId_idx" ON "Client"("userId");
CREATE INDEX "Client_distributorId_idx" ON "Client"("distributorId");
CREATE INDEX "Client_isActive_idx" ON "Client"("isActive");

-- -----------------------------------------------------
-- Table: DistributorInventory
-- Description: Inventory levels at distributor locations
-- -----------------------------------------------------
CREATE TABLE "DistributorInventory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "distributorId" TEXT NOT NULL,
  "productId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "DistributorInventory_distributorId_productId_key" UNIQUE ("distributorId", "productId"),
  CONSTRAINT "DistributorInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for DistributorInventory table
CREATE INDEX "DistributorInventory_distributorId_idx" ON "DistributorInventory"("distributorId");
CREATE INDEX "DistributorInventory_productId_idx" ON "DistributorInventory"("productId");

-- -----------------------------------------------------
-- Table: Order
-- Description: Orders (warehouse→distributor or distributor→client)
-- -----------------------------------------------------
CREATE TABLE "Order" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderNumber" TEXT NOT NULL UNIQUE,
  "warehouseId" TEXT NOT NULL,
  "distributorId" TEXT,
  "clientId" TEXT,
  "placedByUserId" TEXT NOT NULL,
  "orderType" "OrderType" NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  "paymentStatus" "PaymentStatus" NOT NULL,
  "paymentMethod" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "fulfilledAt" TIMESTAMP WITH TIME ZONE,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for Order table
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
CREATE INDEX "Order_warehouseId_idx" ON "Order"("warehouseId");
CREATE INDEX "Order_distributorId_idx" ON "Order"("distributorId");
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- -----------------------------------------------------
-- Table: OrderItem
-- Description: Line items for orders
-- -----------------------------------------------------
CREATE TABLE "OrderItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(10, 2) NOT NULL,
  "subtotal" DECIMAL(10, 2) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for OrderItem table
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- -----------------------------------------------------
-- Table: InventoryTransaction
-- Description: Audit trail for all inventory changes
-- -----------------------------------------------------
CREATE TABLE "InventoryTransaction" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "warehouseId" TEXT,
  "distributorId" TEXT,
  "productId" UUID NOT NULL,
  "transactionType" "TransactionType" NOT NULL,
  "quantityChange" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "referenceOrderId" TEXT,
  "performedByUserId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for InventoryTransaction table
CREATE INDEX "InventoryTransaction_warehouseId_idx" ON "InventoryTransaction"("warehouseId");
CREATE INDEX "InventoryTransaction_distributorId_idx" ON "InventoryTransaction"("distributorId");
CREATE INDEX "InventoryTransaction_productId_idx" ON "InventoryTransaction"("productId");
CREATE INDEX "InventoryTransaction_transactionType_idx" ON "InventoryTransaction"("transactionType");
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

-- -----------------------------------------------------
-- Table: Payment
-- Description: M-Pesa payment records (warehouse→distributor)
-- -----------------------------------------------------
CREATE TABLE "Payment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" TEXT NOT NULL UNIQUE,
  "amount" DECIMAL(10, 2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "mpesaPhoneNumber" TEXT,
  "mpesaTransactionId" TEXT,
  "mpesaReceiptNumber" TEXT,
  "status" "PaymentStatus" NOT NULL,
  "paidAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for Payment table
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_mpesaTransactionId_idx" ON "Payment"("mpesaTransactionId");

-- -----------------------------------------------------
-- Table: ClientPayment
-- Description: Manual payment tracking (distributor→client)
-- -----------------------------------------------------
CREATE TABLE "ClientPayment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "distributorId" TEXT NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "markedPaidByUserId" TEXT NOT NULL,
  "paymentNotes" TEXT,
  "markedPaidAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for ClientPayment table
CREATE INDEX "ClientPayment_orderId_idx" ON "ClientPayment"("orderId");
CREATE INDEX "ClientPayment_clientId_idx" ON "ClientPayment"("clientId");
CREATE INDEX "ClientPayment_distributorId_idx" ON "ClientPayment"("distributorId");

-- =====================================================
-- 3. CREATE TRIGGERS FOR updatedAt COLUMNS
-- =====================================================

-- Generic function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for User table
CREATE TRIGGER update_user_updated_at
  BEFORE UPDATE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for WarehouseInventory table
CREATE TRIGGER update_warehouse_inventory_updated_at
  BEFORE UPDATE ON "WarehouseInventory"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for DistributorInventory table
CREATE TRIGGER update_distributor_inventory_updated_at
  BEFORE UPDATE ON "DistributorInventory"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for Order table
CREATE TRIGGER update_order_updated_at
  BEFORE UPDATE ON "Order"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TYPE "UserRole" IS 'User role types: OWNER (system owner), MANAGER (warehouse manager), DISTRIBUTOR (product distributor), CLIENT (end customer)';
COMMENT ON TYPE "OrderType" IS 'Order flow types: WAREHOUSE_TO_DISTRIBUTOR (warehouse fulfills distributor order), DISTRIBUTOR_TO_CLIENT (distributor fulfills client order)';
COMMENT ON TYPE "OrderStatus" IS 'Order processing status: PENDING (newly created), PROCESSING (being prepared), FULFILLED (completed), CANCELLED (cancelled)';
COMMENT ON TYPE "PaymentStatus" IS 'Payment status: UNPAID (not paid), PENDING (payment processing), PAID (payment confirmed), FAILED (payment failed)';
COMMENT ON TYPE "TransactionType" IS 'Inventory transaction types: RESTOCK (manager adds stock), ORDER_FULFILLED (order processed), ORDER_RECEIVED (distributor receives order), ADJUSTMENT (manual adjustment)';

COMMENT ON TABLE "User" IS 'All system users including owners, managers, distributors, and clients';
COMMENT ON TABLE "Warehouse" IS 'Warehouse information (single warehouse in Phase 1)';
COMMENT ON TABLE "WarehouseManager" IS 'Junction table mapping managers to warehouses';
COMMENT ON TABLE "Product" IS 'Canned soda products available in the system';
COMMENT ON TABLE "WarehouseInventory" IS 'Current inventory levels at the warehouse';
COMMENT ON TABLE "Distributor" IS 'Distributor business information';
COMMENT ON TABLE "WarehouseDistributor" IS 'Junction table mapping distributors to warehouses with audit trail';
COMMENT ON TABLE "Client" IS 'Client business information linked to distributors';
COMMENT ON TABLE "DistributorInventory" IS 'Current inventory levels at distributor locations';
COMMENT ON TABLE "Order" IS 'Orders flowing through the supply chain (warehouse→distributor or distributor→client)';
COMMENT ON TABLE "OrderItem" IS 'Line items (products and quantities) for each order';
COMMENT ON TABLE "InventoryTransaction" IS 'Complete audit trail of all inventory movements and changes';
COMMENT ON TABLE "Payment" IS 'M-Pesa payment records for warehouse→distributor transactions';
COMMENT ON TABLE "ClientPayment" IS 'Manual payment tracking for distributor→client transactions';

-- =====================================================
-- 5. GRANT PERMISSIONS (if needed for Supabase)
-- =====================================================

-- Note: Supabase typically handles permissions through RLS policies
-- These grants ensure the application can access the tables

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant all on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant all on sequences (for any auto-increment columns)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Total Enums: 5 (UserRole, OrderType, OrderStatus, PaymentStatus, TransactionType)
-- Total Tables: 15 (User, Warehouse, WarehouseManager, Product, WarehouseInventory,
--                   Distributor, WarehouseDistributor, Client, DistributorInventory,
--                   Order, OrderItem, InventoryTransaction, Payment, ClientPayment)
-- Total Indexes: 41 (including unique constraints and foreign key indexes)
-- Total Triggers: 4 (for updatedAt columns)
-- =====================================================
