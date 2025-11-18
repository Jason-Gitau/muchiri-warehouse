import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateOrderSchema } from '@/types';

// GET /api/orders/[id] - Get single order with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch order items with product details
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

    // Fetch distributor info
    let distributor = null;
    if (order.distributorId) {
      distributor = await prisma.distributor.findUnique({
        where: { id: order.distributorId },
      });
    }

    // Fetch warehouse info
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: order.warehouseId },
    });

    return NextResponse.json({
      ...order,
      items: itemsWithProducts,
      distributor,
      warehouse,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Update order status or add notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = UpdateOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Prevent updates to fulfilled or cancelled orders
    if (
      existingOrder.status === 'FULFILLED' ||
      existingOrder.status === 'CANCELLED'
    ) {
      return NextResponse.json(
        { error: `Cannot update order with status ${existingOrder.status}` },
        { status: 400 }
      );
    }

    const { status, paymentStatus, notes } = validationResult.data;

    // Build update data
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
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
    if (updatedOrder.distributorId) {
      distributor = await prisma.distributor.findUnique({
        where: { id: updatedOrder.distributorId },
      });
    }

    return NextResponse.json({
      ...updatedOrder,
      items: itemsWithProducts,
      distributor,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
