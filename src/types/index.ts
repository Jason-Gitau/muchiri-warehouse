import { z } from 'zod';

// Product Schema
export const ProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100),
  flavor: z.string().min(1, 'Flavor is required').max(50),
  category: z.string().min(1, 'Category is required'),
  sku: z.string().min(1, 'SKU is required').max(50),
  unitPrice: z.number().positive('Price must be positive'),
  initialStock: z.number().int().min(0, 'Stock must be non-negative'),
  reorderLevel: z.number().int().min(0).default(50),
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

// Order Creation Schema
export const CreateOrderSchema = z.object({
  distributorId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export type CreateOrderFormData = z.infer<typeof CreateOrderSchema>;

// Order Update Schema
export const UpdateOrderSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'FULFILLED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PENDING', 'PAID', 'FAILED']).optional(),
  notes: z.string().optional(),
});

export type UpdateOrderFormData = z.infer<typeof UpdateOrderSchema>;

// Cancel Order Schema
export const CancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

export type CancelOrderFormData = z.infer<typeof CancelOrderSchema>;

// Inventory Restock Schema
export const RestockSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  notes: z.string().optional(),
});

export type RestockFormData = z.infer<typeof RestockSchema>;

// Inventory Adjustment Schema
export const AdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantityChange: z.number().int('Quantity change must be an integer'),
  notes: z.string().min(5, 'Notes must be at least 5 characters explaining the reason'),
});

export type AdjustmentFormData = z.infer<typeof AdjustmentSchema>;

// Cart Item
export interface CartItem {
  productId: string;
  name: string;
  flavor: string;
  unitPrice: number;
  quantity: number;
  availableStock?: number;
}
