import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports/overview
 * Get overview metrics for Owner dashboard
 * - Total revenue (current month, last month, YTD)
 * - Active orders count
 * - Total distributors
 * - Total clients
 * - Current warehouse inventory value
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

    // Calculate date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get current month revenue
    const currentMonthOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: currentMonthStart,
        },
        paymentStatus: 'PAID',
      },
      select: {
        totalAmount: true,
      },
    });

    const currentMonthRevenue = currentMonthOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    // Get last month revenue
    const lastMonthOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
        paymentStatus: 'PAID',
      },
      select: {
        totalAmount: true,
      },
    });

    const lastMonthRevenue = lastMonthOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    // Get YTD revenue
    const ytdOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: yearStart,
        },
        paymentStatus: 'PAID',
      },
      select: {
        totalAmount: true,
      },
    });

    const ytdRevenue = ytdOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    // Get active orders count (PENDING, PROCESSING)
    const activeOrdersCount = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });

    // Get total distributors
    const totalDistributors = await prisma.distributor.count({
      where: {
        isActive: true,
      },
    });

    // Get total clients
    const totalClients = await prisma.client.count({
      where: {
        isActive: true,
      },
    });

    // Get warehouse inventory value
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

    return NextResponse.json({
      revenue: {
        currentMonth: currentMonthRevenue,
        lastMonth: lastMonthRevenue,
        ytd: ytdRevenue,
        percentageChange: lastMonthRevenue > 0
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0,
      },
      activeOrdersCount,
      totalDistributors,
      totalClients,
      inventoryValue,
    });
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview metrics' },
      { status: 500 }
    );
  }
}
