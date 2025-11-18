import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RestockSchema } from '@/types';

// POST /api/inventory/restock - Add quantity to existing inventory
export async function POST(request: NextRequest) {
  try {
    // TODO: Add auth check - verify user has MANAGER role
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'MANAGER') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    const body = await request.json();

    // Validate request body
    const validationResult = RestockSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { productId, quantity, notes } = validationResult.data;

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

    if (!product.isActive) {
      return NextResponse.json(
        { error: 'Cannot restock inactive product' },
        { status: 400 }
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

    // TODO: Get actual user ID from session
    // For now using a placeholder
    const performedByUserId = warehouse.ownerId;

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
      const newQuantity = inventory.quantity + quantity;

      // 3. Update inventory
      const updatedInventory = await tx.warehouseInventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          quantity: newQuantity,
          lastRestockedAt: new Date(),
        },
      });

      // 4. Create transaction record for audit trail
      const transaction = await tx.inventoryTransaction.create({
        data: {
          warehouseId: warehouse.id,
          productId,
          transactionType: 'RESTOCK',
          quantityChange: quantity,
          balanceAfter: newQuantity,
          performedByUserId,
          notes: notes || `Restocked ${quantity} units`,
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

    return NextResponse.json(
      {
        success: true,
        message: `Successfully restocked ${quantity} units of ${productDetails?.name}`,
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
    console.error('Error restocking inventory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to restock inventory' },
      { status: 500 }
    );
  }
}
