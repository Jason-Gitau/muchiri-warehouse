import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports/revenue
 * Get revenue trend data for past 12 months
 * Optional query params:
 * - byDistributor: true/false (breakdown by distributor)
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
    const byDistributor = searchParams.get('byDistributor') === 'true';

    // Get data for past 12 months
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: twelveMonthsAgo,
        },
        paymentStatus: 'PAID',
      },
      select: {
        totalAmount: true,
        createdAt: true,
        distributorId: true,
        distributor: byDistributor
          ? {
              select: {
                businessName: true,
              },
            }
          : false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Generate array of last 12 months
    const months: { month: string; year: number; monthNum: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        monthNum: date.getMonth(),
      });
    }

    if (!byDistributor) {
      // Simple revenue by month
      const revenueByMonth = months.map((m) => {
        const monthRevenue = orders
          .filter((order) => {
            const orderDate = new Date(order.createdAt);
            return (
              orderDate.getMonth() === m.monthNum &&
              orderDate.getFullYear() === m.year
            );
          })
          .reduce((sum, order) => sum + Number(order.totalAmount), 0);

        return {
          month: `${m.month} ${m.year}`,
          revenue: monthRevenue,
        };
      });

      return NextResponse.json({ revenueByMonth });
    } else {
      // Revenue breakdown by distributor
      const distributors = await prisma.distributor.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          businessName: true,
        },
      });

      const revenueByMonth = months.map((m) => {
        const monthData: any = {
          month: `${m.month} ${m.year}`,
        };

        distributors.forEach((dist) => {
          const distRevenue = orders
            .filter((order) => {
              const orderDate = new Date(order.createdAt);
              return (
                orderDate.getMonth() === m.monthNum &&
                orderDate.getFullYear() === m.year &&
                order.distributorId === dist.id
              );
            })
            .reduce((sum, order) => sum + Number(order.totalAmount), 0);

          monthData[dist.businessName] = distRevenue;
        });

        return monthData;
      });

      return NextResponse.json({
        revenueByMonth,
        distributors: distributors.map((d) => d.businessName),
      });
    }
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
