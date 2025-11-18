import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get distributor ID from user
    const distributor = await prisma.distributor.findUnique({
      where: { userId: user.id },
    });

    if (!distributor) {
      return NextResponse.json(
        { error: 'Distributor not found' },
        { status: 404 }
      );
    }

    const { id: orderId } = await params;

    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItem: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify this order belongs to the distributor
    if (order.distributorId !== distributor.id) {
      return NextResponse.json(
        { error: 'You are not authorized to receive this order' },
        { status: 403 }
      );
    }

    // Verify order is FULFILLED
    if (order.status !== 'FULFILLED') {
      return NextResponse.json(
        { error: 'Order must be fulfilled before it can be received' },
        { status: 400 }
      );
    }

    // Use Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Process each order item
      for (const item of order.orderItem) {
        // Check if distributor already has this product in inventory
        const existingInventory = await tx.distributorInventory.findUnique({
          where: {
            distributorId_productId: {
              distributorId: distributor.id,
              productId: item.productId,
            },
          },
        });

        if (existingInventory) {
          // Update existing inventory
          const newQuantity = existingInventory.quantity + item.quantity;

          await tx.distributorInventory.update({
            where: {
              distributorId_productId: {
                distributorId: distributor.id,
                productId: item.productId,
              },
            },
            data: {
              quantity: newQuantity,
            },
          });

          // Create inventory transaction record
          await tx.inventoryTransaction.create({
            data: {
              distributorId: distributor.id,
              productId: item.productId,
              transactionType: 'ORDER_RECEIVED',
              quantityChange: item.quantity,
              balanceAfter: newQuantity,
              referenceOrderId: order.id,
              performedByUserId: user.id,
              notes: `Received from order ${order.orderNumber}`,
            },
          });
        } else {
          // Create new inventory record
          await tx.distributorInventory.create({
            data: {
              distributorId: distributor.id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });

          // Create inventory transaction record
          await tx.inventoryTransaction.create({
            data: {
              distributorId: distributor.id,
              productId: item.productId,
              transactionType: 'ORDER_RECEIVED',
              quantityChange: item.quantity,
              balanceAfter: item.quantity,
              referenceOrderId: order.id,
              performedByUserId: user.id,
              notes: `Received from order ${order.orderNumber}`,
            },
          });
        }
      }

      // Update order with receivedAt timestamp
      // Note: We need to add this field to the schema if it doesn't exist
      // For now, we can use the updatedAt field
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          updatedAt: new Date(),
        },
      });

      return updatedOrder;
    });

    return NextResponse.json({
      success: true,
      message: 'Order marked as received',
      order: result,
    });
  } catch (error) {
    console.error('Error receiving order:', error);
    return NextResponse.json(
      { error: 'Failed to mark order as received' },
      { status: 500 }
    );
  }
}
