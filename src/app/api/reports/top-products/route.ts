import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports/top-products
 * Get top selling products/flavors
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - limit: number (default 10)
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get all order items with product details
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: Object.keys(dateFilter).length > 0
          ? {
              createdAt: dateFilter,
              status: 'FULFILLED', // Only count fulfilled orders
            }
          : {
              status: 'FULFILLED',
            },
      },
      include: {
        product: {
          select: {
            name: true,
            flavor: true,
            category: true,
          },
        },
      },
    });

    // Aggregate by product
    const productStats: {
      [key: string]: {
        productId: string;
        name: string;
        flavor: string;
        category: string;
        unitsSold: number;
        revenue: number;
      };
    } = {};

    orderItems.forEach((item) => {
      if (!productStats[item.productId]) {
        productStats[item.productId] = {
          productId: item.productId,
          name: item.product.name,
          flavor: item.product.flavor,
          category: item.product.category,
          unitsSold: 0,
          revenue: 0,
        };
      }

      productStats[item.productId].unitsSold += item.quantity;
      productStats[item.productId].revenue += Number(item.subtotal);
    });

    // Convert to array and sort by units sold
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, limit);

    return NextResponse.json({
      topProducts,
      totalProducts: Object.keys(productStats).length,
    });
  } catch (error) {
    console.error('Error fetching top products data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top products data' },
      { status: 500 }
    );
  }
}
