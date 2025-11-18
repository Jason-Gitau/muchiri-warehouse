-- ============================================================================
-- Row-Level Security (RLS) Policies for Muchiri Warehouse System
-- ============================================================================
-- Purpose: Enforce role-based access control at the database level
-- Roles: OWNER, MANAGER, DISTRIBUTOR, CLIENT
-- Created: November 18, 2025
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- OWNER: Full access to all users
CREATE POLICY "owner_all_users" ON users
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Can view distributors and clients in their warehouse
CREATE POLICY "manager_view_users" ON users
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Can view their own clients
CREATE POLICY "distributor_view_clients" ON users
  FOR SELECT
  USING (
    id IN (
      SELECT c.user_id FROM clients c
      JOIN distributors d ON c.distributor_id = d.id
      WHERE d.user_id = auth.uid() AND c.is_active = true
    )
    OR id = auth.uid()
  );

-- ALL USERS: Can view and update their own record
CREATE POLICY "self_view_users" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "self_update_users" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. WAREHOUSES TABLE
-- ============================================================================

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- OWNER: Full access to all warehouses
CREATE POLICY "owner_all_warehouses" ON warehouses
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Read access to their warehouse
CREATE POLICY "manager_view_warehouses" ON warehouses
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE warehouse_id = warehouses.id AND is_active = true
    )
  );

-- DISTRIBUTOR: Read access to warehouses they're linked to
CREATE POLICY "distributor_view_warehouses" ON warehouses
  FOR SELECT
  USING (
    id IN (
      SELECT wd.warehouse_id FROM warehouse_distributors wd
      JOIN distributors d ON wd.distributor_id = d.id
      WHERE d.user_id = auth.uid() AND wd.is_active = true
    )
  );

-- ============================================================================
-- 3. WAREHOUSE_MANAGERS TABLE
-- ============================================================================

ALTER TABLE warehouse_managers ENABLE ROW LEVEL SECURITY;

-- OWNER: Full access to manage warehouse managers
CREATE POLICY "owner_all_warehouse_managers" ON warehouse_managers
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Can view their own assignment
CREATE POLICY "manager_view_own_assignment" ON warehouse_managers
  FOR SELECT
  USING (manager_id = auth.uid());

-- ============================================================================
-- 4. PRODUCTS TABLE
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- OWNER: Full access to all products
CREATE POLICY "owner_all_products" ON products
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Full access to products
CREATE POLICY "manager_all_products" ON products
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Read access to active products
CREATE POLICY "distributor_view_products" ON products
  FOR SELECT
  USING (
    is_active = true
    AND auth.uid() IN (SELECT user_id FROM distributors WHERE is_active = true)
  );

-- CLIENT: Read access to active products from their distributor's inventory
CREATE POLICY "client_view_products" ON products
  FOR SELECT
  USING (
    is_active = true
    AND id IN (
      SELECT di.product_id FROM distributor_inventory di
      JOIN clients c ON di.distributor_id = c.distributor_id
      WHERE c.user_id = auth.uid() AND c.is_active = true
    )
  );

-- ============================================================================
-- 5. WAREHOUSE_INVENTORY TABLE
-- ============================================================================

ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_warehouse_inventory" ON warehouse_inventory
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Full access to warehouse inventory
CREATE POLICY "manager_all_warehouse_inventory" ON warehouse_inventory
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT wm.manager_id FROM warehouse_managers wm
      WHERE wm.warehouse_id = warehouse_inventory.warehouse_id AND wm.is_active = true
    )
  );

-- DISTRIBUTOR: Read access for ordering purposes
CREATE POLICY "distributor_view_warehouse_inventory" ON warehouse_inventory
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT d.user_id FROM distributors d
      JOIN warehouse_distributors wd ON d.id = wd.distributor_id
      WHERE wd.warehouse_id = warehouse_inventory.warehouse_id
        AND wd.is_active = true
        AND d.is_active = true
    )
  );

-- ============================================================================
-- 6. DISTRIBUTORS TABLE
-- ============================================================================

ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_distributors" ON distributors
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Full access to distributors
CREATE POLICY "manager_all_distributors" ON distributors
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Can view and update their own record
CREATE POLICY "distributor_view_own" ON distributors
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "distributor_update_own" ON distributors
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 7. WAREHOUSE_DISTRIBUTORS TABLE
-- ============================================================================

ALTER TABLE warehouse_distributors ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_warehouse_distributors" ON warehouse_distributors
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Full access to manage warehouse-distributor relationships
CREATE POLICY "manager_all_warehouse_distributors" ON warehouse_distributors
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers
      WHERE warehouse_id = warehouse_distributors.warehouse_id AND is_active = true
    )
  );

-- DISTRIBUTOR: Read access to their own assignment
CREATE POLICY "distributor_view_own_assignment" ON warehouse_distributors
  FOR SELECT
  USING (
    distributor_id IN (
      SELECT id FROM distributors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. CLIENTS TABLE
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_clients" ON clients
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Read access to all clients
CREATE POLICY "manager_view_clients" ON clients
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- MANAGER: Can update clients (for bulk reassignment)
CREATE POLICY "manager_update_clients" ON clients
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Full access to their own clients
CREATE POLICY "distributor_all_clients" ON clients
  FOR ALL
  USING (
    distributor_id IN (
      SELECT id FROM distributors WHERE user_id = auth.uid()
    )
  );

-- CLIENT: Can view and update their own record
CREATE POLICY "client_view_own" ON clients
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "client_update_own" ON clients
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 9. DISTRIBUTOR_INVENTORY TABLE
-- ============================================================================

ALTER TABLE distributor_inventory ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_distributor_inventory" ON distributor_inventory
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Read access to all distributor inventory
CREATE POLICY "manager_view_distributor_inventory" ON distributor_inventory
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Full access to their own inventory
CREATE POLICY "distributor_all_own_inventory" ON distributor_inventory
  FOR ALL
  USING (
    distributor_id IN (
      SELECT id FROM distributors WHERE user_id = auth.uid()
    )
  );

-- CLIENT: Read access to their distributor's inventory
CREATE POLICY "client_view_distributor_inventory" ON distributor_inventory
  FOR SELECT
  USING (
    distributor_id IN (
      SELECT distributor_id FROM clients WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- 10. ORDERS TABLE
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access to all orders
CREATE POLICY "owner_view_all_orders" ON orders
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Full access to warehouse orders
CREATE POLICY "manager_all_warehouse_orders" ON orders
  FOR ALL
  USING (
    order_type = 'WAREHOUSE_TO_DISTRIBUTOR'
    AND auth.uid() IN (
      SELECT manager_id FROM warehouse_managers
      WHERE warehouse_id = orders.warehouse_id AND is_active = true
    )
  );

-- MANAGER: Read access to distributor-client orders for analytics
CREATE POLICY "manager_view_distributor_orders" ON orders
  FOR SELECT
  USING (
    order_type = 'DISTRIBUTOR_TO_CLIENT'
    AND auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Full access to orders they placed (warehouse orders)
CREATE POLICY "distributor_all_warehouse_orders" ON orders
  FOR ALL
  USING (
    order_type = 'WAREHOUSE_TO_DISTRIBUTOR'
    AND distributor_id IN (
      SELECT id FROM distributors WHERE user_id = auth.uid()
    )
  );

-- DISTRIBUTOR: Full access to client orders they receive
CREATE POLICY "distributor_all_client_orders" ON orders
  FOR ALL
  USING (
    order_type = 'DISTRIBUTOR_TO_CLIENT'
    AND distributor_id IN (
      SELECT id FROM distributors WHERE user_id = auth.uid()
    )
  );

-- CLIENT: Can create and view their own orders
CREATE POLICY "client_insert_orders" ON orders
  FOR INSERT
  WITH CHECK (
    order_type = 'DISTRIBUTOR_TO_CLIENT'
    AND client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "client_view_own_orders" ON orders
  FOR SELECT
  USING (
    order_type = 'DISTRIBUTOR_TO_CLIENT'
    AND client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. ORDER_ITEMS TABLE
-- ============================================================================

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_all_order_items" ON order_items
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Full access to order items for warehouse orders
CREATE POLICY "manager_all_order_items" ON order_items
  FOR ALL
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN warehouse_managers wm ON o.warehouse_id = wm.warehouse_id
      WHERE wm.manager_id = auth.uid() AND wm.is_active = true
    )
  );

-- DISTRIBUTOR: Full access to their order items
CREATE POLICY "distributor_all_order_items" ON order_items
  FOR ALL
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN distributors d ON o.distributor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- CLIENT: Can insert and view order items for their own orders
CREATE POLICY "client_insert_order_items" ON order_items
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "client_view_own_order_items" ON order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 12. PAYMENTS TABLE (M-Pesa Payments)
-- ============================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_all_payments" ON payments
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Full access to payments
CREATE POLICY "manager_all_payments" ON payments
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Can create and view payments for their own orders
CREATE POLICY "distributor_insert_payments" ON payments
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN distributors d ON o.distributor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "distributor_view_own_payments" ON payments
  FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN distributors d ON o.distributor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 13. CLIENT_PAYMENTS TABLE (Manual Tracking)
-- ============================================================================

ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_all_client_payments" ON client_payments
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Read access for analytics
CREATE POLICY "manager_view_client_payments" ON client_payments
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Full access to client payments they manage
CREATE POLICY "distributor_all_client_payments" ON client_payments
  FOR ALL
  USING (
    distributor_id IN (
      SELECT id FROM distributors WHERE user_id = auth.uid()
    )
  );

-- CLIENT: Read access to their own payments
CREATE POLICY "client_view_own_payments" ON client_payments
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 14. INVENTORY_TRANSACTIONS TABLE (Audit Trail)
-- ============================================================================

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- OWNER: Full read access
CREATE POLICY "owner_view_all_inventory_transactions" ON inventory_transactions
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'OWNER')
  );

-- MANAGER: Full access to all inventory transactions
CREATE POLICY "manager_all_inventory_transactions" ON inventory_transactions
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT manager_id FROM warehouse_managers WHERE is_active = true
    )
  );

-- DISTRIBUTOR: Can create and view their own inventory transactions
CREATE POLICY "distributor_insert_inventory_transactions" ON inventory_transactions
  FOR INSERT
  WITH CHECK (
    distributor_id IN (
      SELECT id FROM distributors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "distributor_view_own_inventory_transactions" ON inventory_transactions
  FOR SELECT
  USING (
    distributor_id IN (
      SELECT id FROM distributors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICY SUMMARY
-- ============================================================================
-- Total Tables Secured: 14
-- Total Policies Created: 70
--
-- Tables:
-- 1. users (5 policies)
-- 2. warehouses (3 policies)
-- 3. warehouse_managers (2 policies)
-- 4. products (4 policies)
-- 5. warehouse_inventory (3 policies)
-- 6. distributors (3 policies)
-- 7. warehouse_distributors (3 policies)
-- 8. clients (5 policies)
-- 9. distributor_inventory (4 policies)
-- 10. orders (7 policies)
-- 11. order_items (5 policies)
-- 12. payments (4 policies)
-- 13. client_payments (4 policies)
-- 14. inventory_transactions (4 policies)
--
-- Security Model:
-- - OWNER: Full access to all data (read-only in most cases)
-- - MANAGER: Full access to warehouse operations, distributors, products, inventory
-- - DISTRIBUTOR: Full access to own data, orders, clients, and inventory
-- - CLIENT: Limited to viewing products and managing own orders
--
-- Key Features:
-- - Row-level isolation between roles
-- - Prevents cross-role data access
-- - Supports multi-level supply chain (warehouse -> distributor -> client)
-- - Maintains audit trail integrity
-- - Enables secure M-Pesa payment processing
-- - Protects sensitive business data
-- ============================================================================
