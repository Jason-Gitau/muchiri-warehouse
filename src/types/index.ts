import { z } from 'zod';

// Product Schema
export const ProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100),
  flavor: z.string().min(1, 'Flavor is required').max(50),
  category: z.string().min(1, 'Category is required'),
  sku: z.string().min(1, 'SKU is required').max(50),
  unitPrice: z.number().positive('Price must be positive'),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export type ProductFormData = z.infer<typeof ProductSchema>;

// Order Item Schema
export const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export type OrderItemFormData = z.infer<typeof OrderItemSchema>;

// User Roles
export type UserRole = 'OWNER' | 'MANAGER' | 'DISTRIBUTOR' | 'CLIENT';

// Order Status
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'FULFILLED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';
export type OrderType = 'WAREHOUSE_TO_DISTRIBUTOR' | 'DISTRIBUTOR_TO_CLIENT';

// Transaction Type
export type TransactionType = 'RESTOCK' | 'ORDER_FULFILLED' | 'ORDER_RECEIVED' | 'ADJUSTMENT';
