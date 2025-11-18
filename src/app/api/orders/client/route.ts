import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for client order creation
const CreateClientOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  notes: z.string().optional(),
});

/**
 * POST /api/orders/client
 * Create a new DISTRIBUTOR_TO_CLIENT order
 */
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

    // Only clients can create client orders
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only clients can create orders' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = CreateClientOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { items, notes } = validationResult.data;

    // Get client record to find their distributor
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }

    if (!client.isActive) {
      return NextResponse.json({ error: 'Your account is inactive' }, { status: 403 });
    }

    // Verify distributor exists and is active
    const distributor = await prisma.distributor.findUnique({
      where: { id: client.distributorId },
    });

    if (!distributor || !distributor.isActive) {
      return NextResponse.json(
        { error: 'Your distributor is not available' },
        { status: 404 }
      );
    }

    // Validate stock availability and calculate total
    let totalAmount = 0;
    const itemsWithPrices = await Promise.all(
      items.map(async (item) => {
        // Get product details
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new Error(`Product not available`);
        }

        // Check distributor has this product in stock
        const distributorStock = await prisma.distributorInventory.findUnique({
          where: {
            distributorId_productId: {
              distributorId: client.distributorId,
              productId: item.productId,
            },
          },
        });

        if (!distributorStock || distributorStock.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${distributorStock?.quantity || 0}, Requested: ${item.quantity}`
          );
        }

        const unitPrice = Number(product.unitPrice);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        };
      })
    );

    // Generate unique order number (format: CLT-YYYY-####)
    const currentYear = new Date().getFullYear();
    const orderCount = await prisma.order.count({
      where: {
        orderNumber: {
          startsWith: `CLT-${currentYear}-`,
        },
      },
    });
    const orderNumber = `CLT-${currentYear}-${String(orderCount + 1).padStart(4, '0')}`;

    // Get warehouse (needed for order record)
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      return NextResponse.json(
        { error: 'System error: No warehouse found' },
        { status: 500 }
      );
    }

    // Create order and order items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          warehouseId: warehouse.id,
          distributorId: client.distributorId,
          clientId: client.id,
          placedByUserId: user.id,
          orderType: 'DISTRIBUTOR_TO_CLIENT',
          status: 'PENDING',
          totalAmount,
          paymentStatus: 'UNPAID', // Client hasn't paid yet
          notes,
        },
      });

      // Create order items
      await Promise.all(
        itemsWithPrices.map((item) =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            },
          })
        )
      );

      return newOrder;
    });

    // Fetch complete order with items for response
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Order created successfully',
        order: completeOrder,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating client order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
