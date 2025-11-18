import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/owner/stats
 * Fetch comprehensive stats for owner dashboard
 */
export async function GET() {
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

    // Only owners can view these stats
    if (user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Start of current month
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    // Start of last month
    const startOfLastMonth = new Date(lastMonthYear, lastMonth, 1);
    // Start of current year
    const startOfYear = new Date(currentYear, 0, 1);

    // 1. Revenue Stats
    const [currentMonthOrders, lastMonthOrders, ytdOrders] = await Promise.all([
      // Current month revenue
      prisma.order.findMany({
        where: {
          paymentStatus: 'PAID',
          createdAt: {
            gte: startOfCurrentMonth,
          },
        },
        select: {
          totalAmount: true,
        },
      }),
      // Last month revenue
      prisma.order.findMany({
        where: {
          paymentStatus: 'PAID',
          createdAt: {
            gte: startOfLastMonth,
            lt: startOfCurrentMonth,
          },
        },
        select: {
          totalAmount: true,
        },
      }),
      // Year to date revenue
      prisma.order.findMany({
        where: {
          paymentStatus: 'PAID',
          createdAt: {
            gte: startOfYear,
          },
        },
        select: {
          totalAmount: true,
        },
      }),
    ]);

    const currentMonthRevenue = currentMonthOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );
    const lastMonthRevenue = lastMonthOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );
    const ytdRevenue = ytdOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    // Calculate revenue growth percentage
    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // 2. Active Orders Count (Pending + Processing)
    const activeOrdersCount = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });

    // 3. Total Distributors
    const totalDistributors = await prisma.distributor.count({
      where: {
        isActive: true,
      },
    });

    // 4. Total Clients
    const totalClients = await prisma.client.count({
      where: {
        isActive: true,
      },
    });

    // 5. Warehouse Inventory Value
    const warehouseInventory = await prisma.warehouseInventory.findMany({
      include: {
        product: {
          select: {
            unitPrice: true,
          },
        },
      },
    });

    const inventoryValue = warehouseInventory.reduce(
      (sum, item) => sum + item.quantity * Number(item.product.unitPrice),
      0
    );

    // 6. Total Products
    const totalProducts = await prisma.product.count({
      where: {
        isActive: true,
      },
    });

    // 7. Low Stock Products
    const lowStockProducts = await prisma.warehouseInventory.count({
      where: {
        quantity: {
          lte: prisma.warehouseInventory.fields.reorderPoint,
        },
      },
    });

    // 8. Orders Statistics
    const [totalOrders, pendingOrders, fulfilledOrders, completedOrders] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({
          where: { status: 'PENDING' },
        }),
        prisma.order.count({
          where: { status: 'FULFILLED' },
        }),
        prisma.order.count({
          where: { status: { in: ['RECEIVED', 'DELIVERED'] } },
        }),
      ]);

    // 9. Recent Activity (last 10 orders)
    const recentOrders = await prisma.order.findMany({
      take: 10,
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
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    const recentActivity = recentOrders.map((order) => {
      const customerName =
        order.orderType === 'WAREHOUSE_TO_DISTRIBUTOR'
          ? order.distributor?.businessName
          : order.client?.user.fullName;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.totalAmount),
        customerName: customerName || 'Unknown',
        createdAt: order.createdAt,
      };
    });

    // 10. Monthly comparison stats
    const currentMonthOrdersCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfCurrentMonth,
        },
      },
    });

    const lastMonthOrdersCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lt: startOfCurrentMonth,
        },
      },
    });

    const ordersGrowth =
      lastMonthOrdersCount > 0
        ? ((currentMonthOrdersCount - lastMonthOrdersCount) /
            lastMonthOrdersCount) *
          100
        : 0;

    // 11. Average Order Value
    const avgOrderValue =
      totalOrders > 0
        ? ytdRevenue / ytdOrders.length
        : 0;

    return NextResponse.json({
      revenue: {
        currentMonth: currentMonthRevenue,
        lastMonth: lastMonthRevenue,
        yearToDate: ytdRevenue,
        growth: revenueGrowth,
      },
      orders: {
        active: activeOrdersCount,
        total: totalOrders,
        pending: pendingOrders,
        fulfilled: fulfilledOrders,
        completed: completedOrders,
        currentMonth: currentMonthOrdersCount,
        lastMonth: lastMonthOrdersCount,
        growth: ordersGrowth,
        avgOrderValue,
      },
      users: {
        totalDistributors,
        totalClients,
      },
      inventory: {
        totalValue: inventoryValue,
        totalProducts,
        lowStockProducts,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching owner stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
