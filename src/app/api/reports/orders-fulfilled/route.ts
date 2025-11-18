import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports/orders-fulfilled
 * Get orders fulfilled metrics
 * - Total orders fulfilled (by month, quarter, year)
 * - Average fulfillment time
 * - Pending vs. completed orders
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

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentQuarterStart = new Date(
      now.getFullYear(),
      Math.floor(now.getMonth() / 3) * 3,
      1
    );
    const currentYearStart = new Date(now.getFullYear(), 0, 1);

    // Get orders fulfilled this month
    const ordersThisMonth = await prisma.order.count({
      where: {
        status: 'FULFILLED',
        fulfilledAt: {
          gte: currentMonthStart,
        },
      },
    });

    // Get orders fulfilled this quarter
    const ordersThisQuarter = await prisma.order.count({
      where: {
        status: 'FULFILLED',
        fulfilledAt: {
          gte: currentQuarterStart,
        },
      },
    });

    // Get orders fulfilled this year
    const ordersThisYear = await prisma.order.count({
      where: {
        status: 'FULFILLED',
        fulfilledAt: {
          gte: currentYearStart,
        },
      },
    });

    // Get total fulfilled orders with timestamps
    const fulfilledOrders = await prisma.order.findMany({
      where: {
        status: 'FULFILLED',
        fulfilledAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        fulfilledAt: true,
      },
    });

    // Calculate average fulfillment time (in hours)
    let totalFulfillmentTime = 0;
    let orderCount = 0;

    fulfilledOrders.forEach((order) => {
      if (order.fulfilledAt) {
        const timeDiff =
          new Date(order.fulfilledAt).getTime() -
          new Date(order.createdAt).getTime();
        totalFulfillmentTime += timeDiff;
        orderCount++;
      }
    });

    const avgFulfillmentTimeHours =
      orderCount > 0 ? totalFulfillmentTime / orderCount / (1000 * 60 * 60) : 0;

    // Get pending vs completed orders (overall)
    const pendingOrders = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });

    const completedOrders = await prisma.order.count({
      where: {
        status: 'FULFILLED',
      },
    });

    const cancelledOrders = await prisma.order.count({
      where: {
        status: 'CANCELLED',
      },
    });

    // Get monthly breakdown for past 12 months
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyData = [];

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthOrders = await prisma.order.count({
        where: {
          status: 'FULFILLED',
          fulfilledAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      monthlyData.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        ordersFulfilled: monthOrders,
      });
    }

    return NextResponse.json({
      byPeriod: {
        month: ordersThisMonth,
        quarter: ordersThisQuarter,
        year: ordersThisYear,
      },
      avgFulfillmentTimeHours: Math.round(avgFulfillmentTimeHours * 10) / 10,
      ordersByStatus: {
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
      },
      monthlyBreakdown: monthlyData,
    });
  } catch (error) {
    console.error('Error fetching orders fulfilled data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders fulfilled data' },
      { status: 500 }
    );
  }
}
