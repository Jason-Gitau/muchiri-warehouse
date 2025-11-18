import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { AdjustmentSchema } from '@/types';

// POST /api/inventory/adjust - Adjust inventory (positive or negative)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and owners can adjust inventory
    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = AdjustmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { productId, quantityChange, notes } = validationResult.data;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get first warehouse (for MVP, we assume single warehouse)
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      return NextResponse.json(
        { error: 'No warehouse found' },
        { status: 500 }
      );
    }

    // Use actual user ID from session
    const performedByUserId = user.id;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current inventory
      let inventory = await tx.warehouseInventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId,
          },
        },
      });

      // If inventory doesn't exist, create it
      if (!inventory) {
        inventory = await tx.warehouseInventory.create({
          data: {
            warehouseId: warehouse.id,
            productId,
            quantity: 0,
            reorderLevel: 50,
          },
        });
      }

      // 2. Calculate new quantity
      const newQuantity = inventory.quantity + quantityChange;

      // Prevent negative inventory
      if (newQuantity < 0) {
        throw new Error(
          `Cannot adjust inventory: would result in negative quantity (current: ${inventory.quantity}, change: ${quantityChange})`
        );
      }

      // 3. Update inventory
      const updatedInventory = await tx.warehouseInventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          quantity: newQuantity,
        },
      });

      // 4. Create transaction record for audit trail
      const transaction = await tx.inventoryTransaction.create({
        data: {
          warehouseId: warehouse.id,
          productId,
          transactionType: 'ADJUSTMENT',
          quantityChange,
          balanceAfter: newQuantity,
          performedByUserId,
          notes,
        },
      });

      return {
        inventory: updatedInventory,
        transaction,
      };
    });

    // Fetch product details for response
    const productDetails = await prisma.product.findUnique({
      where: { id: productId },
    });

    const adjustmentType = quantityChange > 0 ? 'increased' : 'decreased';
    const absoluteChange = Math.abs(quantityChange);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully ${adjustmentType} inventory by ${absoluteChange} units of ${productDetails?.name}`,
        inventory: {
          ...result.inventory,
          product: productDetails,
          isLowStock: result.inventory.quantity < result.inventory.reorderLevel,
        },
        transaction: result.transaction,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error adjusting inventory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
