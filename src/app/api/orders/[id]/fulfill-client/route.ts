import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/orders/[id]/fulfill-client
 * Distributor fulfills a client order (reduces distributor inventory)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only distributors can fulfill client orders
    if (user.role !== 'DISTRIBUTOR') {
      return NextResponse.json(
        { error: 'Only distributors can fulfill client orders' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Get distributor record
    const distributor = await prisma.distributor.findUnique({
      where: { userId: user.id },
    });

    if (!distributor) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    // Get the order with items
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify this is a client order for this distributor
    if (order.orderType !== 'DISTRIBUTOR_TO_CLIENT') {
      return NextResponse.json(
        { error: 'This endpoint is only for client orders' },
        { status: 400 }
      );
    }

    if (order.distributorId !== distributor.id) {
      return NextResponse.json(
        { error: 'This order does not belong to you' },
        { status: 403 }
      );
    }

    if (order.status === 'FULFILLED') {
      return NextResponse.json(
        { error: 'Order is already fulfilled' },
        { status: 400 }
      );
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot fulfill a cancelled order' },
        { status: 400 }
      );
    }

    // Verify distributor has sufficient stock for all items
    for (const item of order.orderItems) {
      const stock = await prisma.distributorInventory.findUnique({
        where: {
          distributorId_productId: {
            distributorId: distributor.id,
            productId: item.productId,
          },
        },
      });

      if (!stock || stock.quantity < item.quantity) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        return NextResponse.json(
          {
            error: `Insufficient stock for ${product?.name}. Available: ${stock?.quantity || 0}, Required: ${item.quantity}`,
          },
          { status: 400 }
        );
      }
    }

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

      // Reduce distributor inventory and create transaction records
      for (const item of order.orderItems) {
        // Get current inventory
        const currentInventory = await tx.distributorInventory.findUnique({
          where: {
            distributorId_productId: {
              distributorId: distributor.id,
              productId: item.productId,
            },
          },
        });

        if (!currentInventory) {
          throw new Error(`Inventory record not found for product ${item.productId}`);
        }

        const newQuantity = currentInventory.quantity - item.quantity;

        // Update inventory
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
            transactionType: 'ORDER_FULFILLED',
            quantityChange: -item.quantity,
            balanceAfter: newQuantity,
            referenceOrderId: order.id,
            performedByUserId: user.id,
            notes: `Fulfilled client order ${order.orderNumber}`,
          },
        });
      }

      return fulfilledOrder;
    });

    // Fetch complete order with items for response
    const completeOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        client: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Order fulfilled successfully',
      order: completeOrder,
    });
  } catch (error: any) {
    console.error('Error fulfilling client order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fulfill order' },
      { status: 500 }
    );
  }
}
