import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports/distributor-performance
 * Get distributor performance metrics
 * - Distributor name
 * - Total orders placed
 * - Total revenue generated
 * - Average order value
 * - Average fulfillment time
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

    // Get all active distributors
    const distributors = await prisma.distributor.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        businessName: true,
        user: {
          select: {
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Get performance metrics for each distributor
    const performanceData = await Promise.all(
      distributors.map(async (distributor) => {
        // Get all orders from this distributor
        const orders = await prisma.order.findMany({
          where: {
            distributorId: distributor.id,
            orderType: 'WAREHOUSE_TO_DISTRIBUTOR',
          },
          select: {
            totalAmount: true,
            paymentStatus: true,
            status: true,
            createdAt: true,
            fulfilledAt: true,
          },
        });

        // Calculate metrics
        const totalOrders = orders.length;
        const totalRevenue = orders
          .filter((o) => o.paymentStatus === 'PAID')
          .reduce((sum, order) => sum + Number(order.totalAmount), 0);

        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate average fulfillment time (only for fulfilled orders)
        const fulfilledOrders = orders.filter(
          (o) => o.status === 'FULFILLED' && o.fulfilledAt
        );

        let totalFulfillmentTime = 0;
        fulfilledOrders.forEach((order) => {
          if (order.fulfilledAt) {
            const timeDiff =
              new Date(order.fulfilledAt).getTime() -
              new Date(order.createdAt).getTime();
            totalFulfillmentTime += timeDiff;
          }
        });

        const avgFulfillmentTimeHours =
          fulfilledOrders.length > 0
            ? totalFulfillmentTime /
              fulfilledOrders.length /
              (1000 * 60 * 60)
            : 0;

        // Get order status breakdown
        const pendingOrders = orders.filter(
          (o) => o.status === 'PENDING'
        ).length;
        const processingOrders = orders.filter(
          (o) => o.status === 'PROCESSING'
        ).length;
        const fulfilledOrdersCount = fulfilledOrders.length;
        const cancelledOrders = orders.filter(
          (o) => o.status === 'CANCELLED'
        ).length;

        // Get payment status breakdown
        const paidOrders = orders.filter(
          (o) => o.paymentStatus === 'PAID'
        ).length;
        const unpaidOrders = orders.filter(
          (o) => o.paymentStatus === 'UNPAID'
        ).length;

        return {
          distributorId: distributor.id,
          distributorName: distributor.businessName,
          email: distributor.user.email,
          phoneNumber: distributor.user.phoneNumber || 'N/A',
          totalOrders,
          totalRevenue,
          avgOrderValue,
          avgFulfillmentTimeHours:
            Math.round(avgFulfillmentTimeHours * 10) / 10,
          ordersByStatus: {
            pending: pendingOrders,
            processing: processingOrders,
            fulfilled: fulfilledOrdersCount,
            cancelled: cancelledOrders,
          },
          paymentStats: {
            paid: paidOrders,
            unpaid: unpaidOrders,
          },
        };
      })
    );

    // Sort by total revenue (highest first)
    performanceData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      distributors: performanceData,
      summary: {
        totalDistributors: distributors.length,
        totalOrders: performanceData.reduce(
          (sum, d) => sum + d.totalOrders,
          0
        ),
        totalRevenue: performanceData.reduce(
          (sum, d) => sum + d.totalRevenue,
          0
        ),
        avgOrderValue:
          performanceData.reduce((sum, d) => sum + d.avgOrderValue, 0) /
          (distributors.length || 1),
      },
    });
  } catch (error) {
    console.error('Error fetching distributor performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distributor performance' },
      { status: 500 }
    );
  }
}
