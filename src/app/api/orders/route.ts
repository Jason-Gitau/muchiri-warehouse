import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateOrderSchema } from '@/types';

// GET /api/orders - List all orders with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const distributorId = searchParams.get('distributorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {
      orderType: 'WAREHOUSE_TO_DISTRIBUTOR', // Only show warehouse orders
    };

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (distributorId) {
      where.distributorId = distributorId;
    }

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate),
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        // Include order items and product details
        // Note: Prisma schema doesn't have relations set up yet
        // We'll need to manually join or add relations to schema
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Manually fetch order items and products for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: order.id },
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

        // Get distributor info
        let distributor = null;
        if (order.distributorId) {
          distributor = await prisma.distributor.findUnique({
            where: { id: order.distributorId },
          });
        }

        return {
          ...order,
          items: itemsWithProducts,
          distributor,
        };
      })
    );

    return NextResponse.json(ordersWithDetails);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = CreateOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { distributorId, items, notes } = validationResult.data;

    // Verify distributor exists
    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      return NextResponse.json(
        { error: 'Distributor not found' },
        { status: 404 }
      );
    }

    // Fetch product prices and calculate total
    let totalAmount = 0;
    const itemsWithPrices = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (!product.isActive) {
          throw new Error(`Product ${product.name} is not active`);
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

    // Generate unique order number (format: ORD-YYYY-####)
    const currentYear = new Date().getFullYear();
    const orderCount = await prisma.order.count({
      where: {
        orderNumber: {
          startsWith: `ORD-${currentYear}-`,
        },
      },
    });
    const orderNumber = `ORD-${currentYear}-${String(orderCount + 1).padStart(4, '0')}`;

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
    const placedByUserId = distributor.userId;

    // Create order and order items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          warehouseId: warehouse.id,
          distributorId,
          placedByUserId,
          orderType: 'WAREHOUSE_TO_DISTRIBUTOR',
          status: 'PENDING',
          totalAmount,
          paymentStatus: 'UNPAID',
          notes,
        },
      });

      // Create order items
      await tx.orderItem.createMany({
        data: itemsWithPrices.map((item) => ({
          orderId: newOrder.id,
          ...item,
        })),
      });

      return newOrder;
    });

    // Fetch the complete order with items
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });

    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: order.id },
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

    return NextResponse.json(
      {
        ...completeOrder,
        items: itemsWithProducts,
        distributor,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
