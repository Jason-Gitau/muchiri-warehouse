import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * GET /api/owner/stats
 * Get comprehensive stats for Owner dashboard
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
        { error: 'Only owners and managers can view stats' },
        { status: 403 }
      );
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Revenue calculations
    const currentMonthOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: currentMonthStart },
        paymentStatus: 'PAID',
      },
      select: { totalAmount: true },
    });

    const lastMonthOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        paymentStatus: 'PAID',
      },
      select: { totalAmount: true },
    });

    const ytdOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: yearStart },
        paymentStatus: 'PAID',
      },
      select: { totalAmount: true },
    });

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

    const growth =
      lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // Orders statistics
    const allOrders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    const currentMonthOrdersCount = allOrders.filter(
      (o) => new Date(o.createdAt) >= currentMonthStart
    ).length;

    const lastMonthOrdersCount = allOrders.filter(
      (o) =>
        new Date(o.createdAt) >= lastMonthStart &&
        new Date(o.createdAt) <= lastMonthEnd
    ).length;

    const ordersGrowth =
      lastMonthOrdersCount > 0
        ? ((currentMonthOrdersCount - lastMonthOrdersCount) /
            lastMonthOrdersCount) *
          100
        : 0;

    const activeOrders = allOrders.filter(
      (o) => o.status === 'PENDING' || o.status === 'PROCESSING'
    ).length;

    const pendingOrders = allOrders.filter((o) => o.status === 'PENDING').length;

    const fulfilledOrders = allOrders.filter(
      (o) => o.status === 'FULFILLED'
    ).length;

    const completedOrders = fulfilledOrders;

    const avgOrderValue =
      allOrders.length > 0
        ? allOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0) /
          allOrders.length
        : 0;

    // Users statistics
    const totalDistributors = await prisma.distributor.count({
      where: { isActive: true },
    });

    const totalClients = await prisma.client.count({
      where: { isActive: true },
    });

    // Inventory statistics
    const warehouseInventory = await prisma.warehouseInventory.findMany({
      include: {
        product: {
          select: {
            unitPrice: true,
          },
        },
      },
    });

    const totalProducts = await prisma.product.count({
      where: { isActive: true },
    });

    const inventoryValue = warehouseInventory.reduce(
      (sum, item) => sum + item.quantity * Number(item.product.unitPrice),
      0
    );

    const lowStockProducts = warehouseInventory.filter(
      (item) => item.quantity <= item.reorderLevel
    ).length;

    // Recent activity
    const recentOrders = await prisma.order.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        distributor: {
          select: { businessName: true },
        },
        client: {
          select: { businessName: true },
        },
      },
    });

    const recentActivity = recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount),
      customerName:
        order.orderType === 'WAREHOUSE_TO_DISTRIBUTOR'
          ? order.distributor?.businessName || 'Unknown'
          : order.client?.businessName || 'Unknown',
      createdAt: order.createdAt.toISOString(),
    }));

    return NextResponse.json({
      revenue: {
        currentMonth: currentMonthRevenue,
        lastMonth: lastMonthRevenue,
        yearToDate: ytdRevenue,
        growth,
      },
      orders: {
        active: activeOrders,
        total: allOrders.length,
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
      { error: 'Failed to fetch owner stats' },
      { status: 500 }
    );
  }
}
