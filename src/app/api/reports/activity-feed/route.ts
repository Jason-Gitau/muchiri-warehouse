import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports/activity-feed
 * Get recent activity feed
 * - Recent orders (last 20)
 * - Payment confirmations
 * - Stock updates
 * - Distributor/client additions
 *
 * Query params:
 * - limit: number (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is OWNER or MANAGER
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || (dbUser.role !== 'OWNER' && dbUser.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: 'Only owners and managers can view reports' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        distributor: {
          select: {
            businessName: true,
          },
        },
        client: {
          select: {
            businessName: true,
          },
        },
      },
    });

    // Get recent payments
    const recentPayments = await prisma.payment.findMany({
      take: limit,
      where: {
        status: 'PAID',
      },
      orderBy: {
        paidAt: 'desc',
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            distributor: {
              select: {
                businessName: true,
              },
            },
          },
        },
      },
    });

    // Get recent inventory transactions
    const recentStockUpdates = await prisma.inventoryTransaction.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: {
          select: {
            name: true,
            flavor: true,
          },
        },
        performedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Get recent distributors
    const recentDistributors = await prisma.distributor.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        businessName: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // Get recent clients
    const recentClients = await prisma.client.findMany({
      take: 10,
      orderBy: {
        addedAt: 'desc',
      },
      select: {
        id: true,
        businessName: true,
        addedAt: true,
        distributor: {
          select: {
            businessName: true,
          },
        },
      },
    });

    // Combine all activities and sort by timestamp
    const activities: any[] = [];

    // Add order activities
    recentOrders.forEach((order) => {
      activities.push({
        id: `order-${order.id}`,
        type: 'ORDER',
        timestamp: order.createdAt,
        title: `New Order: ${order.orderNumber}`,
        description:
          order.orderType === 'WAREHOUSE_TO_DISTRIBUTOR'
            ? `${order.distributor?.businessName || 'Unknown'} placed an order for $${Number(order.totalAmount).toFixed(2)}`
            : `${order.client?.businessName || 'Unknown'} placed an order for $${Number(order.totalAmount).toFixed(2)}`,
        status: order.status,
        metadata: {
          orderNumber: order.orderNumber,
          amount: Number(order.totalAmount),
          paymentStatus: order.paymentStatus,
        },
      });
    });

    // Add payment activities
    recentPayments.forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'PAYMENT',
        timestamp: payment.paidAt || payment.createdAt,
        title: `Payment Confirmed: ${payment.order.orderNumber}`,
        description: `${payment.order.distributor?.businessName || 'Unknown'} paid $${Number(payment.amount).toFixed(2)} via ${payment.paymentMethod}`,
        status: 'COMPLETED',
        metadata: {
          amount: Number(payment.amount),
          method: payment.paymentMethod,
          mpesaReceipt: payment.mpesaReceiptNumber,
        },
      });
    });

    // Add stock update activities
    recentStockUpdates.forEach((transaction) => {
      const action =
        transaction.transactionType === 'RESTOCK'
          ? 'restocked'
          : transaction.transactionType === 'ORDER_FULFILLED'
          ? 'sold'
          : transaction.transactionType === 'ADJUSTMENT'
          ? 'adjusted'
          : 'updated';

      activities.push({
        id: `stock-${transaction.id}`,
        type: 'STOCK_UPDATE',
        timestamp: transaction.createdAt,
        title: `Stock ${action.charAt(0).toUpperCase() + action.slice(1)}: ${transaction.product.name}`,
        description: `${transaction.performedBy?.fullName || 'System'} ${action} ${Math.abs(transaction.quantityChange)} units of ${transaction.product.name} (${transaction.product.flavor})`,
        status: transaction.transactionType,
        metadata: {
          quantityChange: transaction.quantityChange,
          balanceAfter: transaction.balanceAfter,
          transactionType: transaction.transactionType,
        },
      });
    });

    // Add distributor activities
    recentDistributors.forEach((distributor) => {
      activities.push({
        id: `distributor-${distributor.id}`,
        type: 'DISTRIBUTOR_ADDED',
        timestamp: distributor.createdAt,
        title: `New Distributor: ${distributor.businessName}`,
        description: `${distributor.businessName} was added as a distributor`,
        status: 'ACTIVE',
        metadata: {
          email: distributor.user.email,
        },
      });
    });

    // Add client activities
    recentClients.forEach((client) => {
      activities.push({
        id: `client-${client.id}`,
        type: 'CLIENT_ADDED',
        timestamp: client.addedAt,
        title: `New Client: ${client.businessName || 'Client'}`,
        description: `${client.businessName || 'Client'} was added by ${client.distributor?.businessName || 'Unknown'}`,
        status: 'ACTIVE',
        metadata: {},
      });
    });

    // Sort by timestamp (most recent first) and limit
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      activities: limitedActivities,
      total: activities.length,
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}
