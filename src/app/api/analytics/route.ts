import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/analytics
 * Fetch analytics data for owner dashboard
 */
export async function GET(request: Request) {
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

    // Only owners and managers can view analytics
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get date range from query params (default to last 30 days)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Revenue metrics
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        paymentStatus: 'PAID',
      },
      select: {
        totalAmount: true,
        createdAt: true,
        distributorId: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // Group revenue by month
    const revenueByMonth = orders.reduce((acc: Record<string, number>, order) => {
      const month = new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
      acc[month] = (acc[month] || 0) + Number(order.totalAmount);
      return acc;
    }, {});

    // 2. Top selling products
    const orderItems = await prisma.orderItem.findMany({
      include: {
        product: {
          select: {
            name: true,
            flavor: true,
            unitPrice: true,
          },
        },
      },
    });

    const productSales = orderItems.reduce((acc: Record<string, any>, item) => {
      const key = item.productId;
      if (!acc[key]) {
        acc[key] = {
          productName: item.product.name,
          flavor: item.product.flavor,
          unitsSold: 0,
          revenue: 0,
        };
      }
      acc[key].unitsSold += item.quantity;
      acc[key].revenue += Number(item.subtotal);
      return acc;
    }, {});

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // 3. Distributor performance
    const distributors = await prisma.distributor.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const distributorPerformance = await Promise.all(
      distributors.map(async (distributor) => {
        const distributorOrders = await prisma.order.findMany({
          where: {
            distributorId: distributor.id,
            orderType: 'WAREHOUSE_TO_DISTRIBUTOR',
          },
          select: {
            totalAmount: true,
            paymentStatus: true,
            createdAt: true,
            fulfilledAt: true,
          },
        });

        const totalOrders = distributorOrders.length;
        const totalRevenue = distributorOrders
          .filter((o) => o.paymentStatus === 'PAID')
          .reduce((sum, o) => sum + Number(o.totalAmount), 0);

        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate average fulfillment time (in days)
        const fulfilledOrders = distributorOrders.filter(
          (o) => o.fulfilledAt
        );
        const avgFulfillmentTime =
          fulfilledOrders.length > 0
            ? fulfilledOrders.reduce((sum, o) => {
                const created = new Date(o.createdAt);
                const fulfilled = new Date(o.fulfilledAt!);
                const diff = fulfilled.getTime() - created.getTime();
                return sum + diff / (1000 * 60 * 60 * 24); // Convert to days
              }, 0) / fulfilledOrders.length
            : 0;

        return {
          distributorName: distributor.businessName,
          contactName: distributor.user.fullName,
          totalOrders,
          totalRevenue,
          avgOrderValue,
          avgFulfillmentTime: avgFulfillmentTime.toFixed(1),
        };
      })
    );

    // Sort by revenue
    distributorPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 4. Inventory turnover
    const allProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        warehouseInventory: true,
      },
    });

    const inventoryTurnover = allProducts.map((product) => {
      const inventory = product.warehouseInventory[0];
      const currentStock = inventory?.quantity || 0;
      const reorderLevel = inventory?.reorderLevel || 0;

      // Get units sold for this product
      const productItems = orderItems.filter((item) => item.productId === product.id);
      const unitsSold = productItems.reduce((sum, item) => sum + item.quantity, 0);

      // Calculate turnover rate (units sold / average stock)
      const avgStock = currentStock > 0 ? (currentStock + reorderLevel) / 2 : 1;
      const turnoverRate = unitsSold / avgStock;

      return {
        productName: product.name,
        flavor: product.flavor,
        currentStock,
        reorderLevel,
        unitsSold,
        turnoverRate: turnoverRate.toFixed(2),
        status: currentStock <= reorderLevel ? 'LOW_STOCK' : 'OK',
      };
    });

    // Sort by turnover rate (highest first)
    inventoryTurnover.sort((a, b) => parseFloat(b.turnoverRate) - parseFloat(a.turnoverRate));

    // 5. Recent activity feed
    const recentOrders = await prisma.order.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        distributor: {
          select: {
            businessName: true,
          },
        },
      },
    });

    const recentActivity = recentOrders.map((order) => ({
      id: order.id,
      type: 'ORDER',
      description: `Order #${order.orderNumber} from ${order.distributor?.businessName || 'Unknown'}`,
      status: order.status,
      amount: Number(order.totalAmount),
      timestamp: order.createdAt,
    }));

    // 6. Summary stats
    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
    });
    const fulfilledOrders = await prisma.order.count({
      where: { status: 'FULFILLED' },
    });
    const lowStockProducts = inventoryTurnover.filter((p) => p.status === 'LOW_STOCK').length;

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        fulfilledOrders,
        lowStockProducts,
      },
      revenueByMonth,
      topProducts,
      distributorPerformance,
      inventoryTurnover: inventoryTurnover.slice(0, 10), // Top 10
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
