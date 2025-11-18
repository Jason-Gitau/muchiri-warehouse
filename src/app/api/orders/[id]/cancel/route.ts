import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CancelOrderSchema } from '@/types';

// POST /api/orders/[id]/cancel - Cancel order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = CancelOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { reason } = validationResult.data;

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

    // Check if order can be cancelled
    if (order.status === 'FULFILLED') {
      return NextResponse.json(
        { error: 'Cannot cancel fulfilled order' },
        { status: 400 }
      );
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      );
    }

    // Update order status to CANCELLED
    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: order.notes
          ? `${order.notes}\n\nCancellation reason: ${reason}`
          : `Cancellation reason: ${reason}`,
      },
    });

    // Fetch complete order details
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: id },
    });

    const itemsWithProducts = await Promise.all(
      orderItems.map(async (item) => {
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
    if (cancelledOrder.distributorId) {
      distributor = await prisma.distributor.findUnique({
        where: { id: cancelledOrder.distributorId },
      });
    }

    return NextResponse.json({
      ...cancelledOrder,
      items: itemsWithProducts,
      distributor,
      message: 'Order cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
