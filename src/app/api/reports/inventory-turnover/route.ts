import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports/inventory-turnover
 * Get inventory turnover analysis
 * Query params:
 * - period: 30, 60, or 90 (days, default 30)
 *
 * Returns:
 * - Products with highest/lowest turnover rates
 * - Stock movement over time
 * - Low stock alerts
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
    const period = parseInt(searchParams.get('period') || '30');

    const now = new Date();
    const periodStart = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

    // Get current warehouse inventory
    const warehouseInventory = await prisma.warehouseInventory.findMany({
      include: {
        product: {
          select: {
            name: true,
            flavor: true,
            category: true,
            unitPrice: true,
          },
        },
      },
    });

    // Get inventory transactions for the period
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        createdAt: {
          gte: periodStart,
        },
        warehouseId: {
          not: null,
        },
      },
      include: {
        product: {
          select: {
            name: true,
            flavor: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate turnover rate for each product
    const turnoverData = await Promise.all(
      warehouseInventory.map(async (item) => {
        // Get total units sold in period
        const unitsSold = transactions
          .filter(
            (t) =>
              t.productId === item.productId &&
              t.transactionType === 'ORDER_FULFILLED' &&
              t.quantityChange < 0
          )
          .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);

        // Get total units restocked in period
        const unitsRestocked = transactions
          .filter(
            (t) =>
              t.productId === item.productId &&
              (t.transactionType === 'RESTOCK' ||
                t.transactionType === 'ADJUSTMENT') &&
              t.quantityChange > 0
          )
          .reduce((sum, t) => sum + t.quantityChange, 0);

        // Calculate average inventory (simplified: current + restocked / 2)
        const avgInventory = (item.quantity + unitsRestocked) / 2;

        // Turnover rate = units sold / average inventory
        const turnoverRate = avgInventory > 0 ? unitsSold / avgInventory : 0;

        // Calculate days to sell current stock
        const dailySalesRate = unitsSold / period;
        const daysToSellStock =
          dailySalesRate > 0 ? item.quantity / dailySalesRate : 999;

        return {
          productId: item.productId,
          productName: item.product.name,
          flavor: item.product.flavor,
          category: item.product.category,
          currentStock: item.quantity,
          reorderLevel: item.reorderLevel,
          isLowStock: item.quantity <= item.reorderLevel,
          unitsSold,
          unitsRestocked,
          turnoverRate: Math.round(turnoverRate * 100) / 100,
          daysToSellStock: Math.round(daysToSellStock * 10) / 10,
          inventoryValue: item.quantity * Number(item.product.unitPrice),
        };
      })
    );

    // Sort by turnover rate
    const sortedByTurnover = [...turnoverData].sort(
      (a, b) => b.turnoverRate - a.turnoverRate
    );

    // Get top 10 and bottom 10
    const highestTurnover = sortedByTurnover.slice(0, 10);
    const lowestTurnover = sortedByTurnover.slice(-10).reverse();

    // Get low stock alerts
    const lowStockAlerts = turnoverData
      .filter((item) => item.isLowStock)
      .sort((a, b) => a.currentStock - b.currentStock);

    // Calculate stock movement trends
    const stockMovement = transactions
      .slice(0, 50) // Last 50 transactions
      .map((t) => ({
        date: t.createdAt,
        productName: t.product.name,
        flavor: t.product.flavor,
        transactionType: t.transactionType,
        quantityChange: t.quantityChange,
        balanceAfter: t.balanceAfter,
      }));

    // Summary statistics
    const totalInventoryValue = turnoverData.reduce(
      (sum, item) => sum + item.inventoryValue,
      0
    );
    const avgTurnoverRate =
      turnoverData.reduce((sum, item) => sum + item.turnoverRate, 0) /
      (turnoverData.length || 1);

    return NextResponse.json({
      period,
      highestTurnover,
      lowestTurnover,
      lowStockAlerts,
      stockMovement,
      summary: {
        totalProducts: turnoverData.length,
        totalInventoryValue,
        avgTurnoverRate: Math.round(avgTurnoverRate * 100) / 100,
        lowStockCount: lowStockAlerts.length,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory turnover:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory turnover' },
      { status: 500 }
    );
  }
}
