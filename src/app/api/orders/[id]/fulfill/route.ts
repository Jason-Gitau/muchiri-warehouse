import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/orders/[id]/fulfill - Fulfill order (reduce warehouse inventory)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check 1: Order must be paid
    if (order.paymentStatus !== 'PAID') {
      return NextResponse.json(
        { error: 'Order must be paid before fulfillment' },
        { status: 400 }
      );
    }

    // Check 2: Order must be pending or processing
    if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
      return NextResponse.json(
        { error: `Cannot fulfill order with status ${order.status}` },
        { status: 400 }
      );
    }

    // Fetch order items
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: id },
    });

    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: 'Order has no items' },
        { status: 400 }
      );
    }

    // Check 3: Verify sufficient warehouse stock for all items
    const stockChecks = await Promise.all(
      orderItems.map(async (item) => {
        const inventory = await prisma.warehouseInventory.findFirst({
          where: {
            warehouseId: order.warehouseId,
            productId: item.productId,
          },
        });

        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        return {
          productId: item.productId,
          productName: product?.name || 'Unknown',
          requested: item.quantity,
          available: inventory?.quantity || 0,
          sufficient: (inventory?.quantity || 0) >= item.quantity,
          inventory,
        };
      })
    );

    // Check if any items have insufficient stock
    const insufficientStock = stockChecks.filter((check) => !check.sufficient);
    if (insufficientStock.length > 0) {
      const errorDetails = insufficientStock.map(
        (item) =>
          `${item.productName}: requested ${item.requested}, available ${item.available}`
      );
      return NextResponse.json(
        {
          error: 'Insufficient stock for order fulfillment',
          details: errorDetails,
        },
        { status: 400 }
      );
    }

    // TODO: Get actual user ID from session
    // For now using a placeholder
    const performedByUserId = order.placedByUserId;

    // Fulfill order in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      const fulfilledOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'FULFILLED',
          fulfilledAt: new Date(),
        },
      });

      // Reduce warehouse inventory and create transactions for each item
      for (const item of orderItems) {
        const stockCheck = stockChecks.find(
          (check) => check.productId === item.productId
        );

        if (!stockCheck?.inventory) {
          throw new Error(`Inventory not found for product ${item.productId}`);
        }

        const newQuantity = stockCheck.inventory.quantity - item.quantity;

        // Update warehouse inventory
        await tx.warehouseInventory.update({
          where: { id: stockCheck.inventory.id },
          data: {
            quantity: newQuantity,
            lastRestockedAt: stockCheck.inventory.lastRestockedAt,
          },
        });

        // Create inventory transaction for audit trail
        await tx.inventoryTransaction.create({
          data: {
            warehouseId: order.warehouseId,
            productId: item.productId,
            transactionType: 'ORDER_FULFILLED',
            quantityChange: -item.quantity, // Negative because we're reducing
            balanceAfter: newQuantity,
            referenceOrderId: order.id,
            performedByUserId,
            notes: `Order ${order.orderNumber} fulfilled`,
          },
        });
      }

      return fulfilledOrder;
    });

    // Fetch complete order details
    const orderItems2 = await prisma.orderItem.findMany({
      where: { orderId: id },
    });

    const itemsWithProducts = await Promise.all(
      orderItems2.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        return {
          ...item,
          product,
        };
      })
    );

    let distributor = null;
    if (result.distributorId) {
      distributor = await prisma.distributor.findUnique({
        where: { id: result.distributorId },
      });
    }

    return NextResponse.json({
      ...result,
      items: itemsWithProducts,
      distributor,
      message: 'Order fulfilled successfully',
    });
  } catch (error: any) {
    console.error('Error fulfilling order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fulfill order' },
      { status: 500 }
    );
  }
}
