import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/distributors
 * Fetch all distributors (Manager/Owner only)
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

    // Only managers and owners can view distributors
    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all distributors with user details and order stats
    const distributors = await prisma.distributor.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get order counts and total spent for each distributor
    const distributorsWithStats = await Promise.all(
      distributors.map(async (distributor) => {
        const orders = await prisma.order.findMany({
          where: {
            distributorId: distributor.id,
            orderType: 'WAREHOUSE_TO_DISTRIBUTOR',
          },
          select: {
            totalAmount: true,
            paymentStatus: true,
          },
        });

        const totalOrders = orders.length;
        const totalSpent = orders
          .filter((o) => o.paymentStatus === 'PAID')
          .reduce((sum, o) => sum + Number(o.totalAmount), 0);

        // Get client count
        const clientCount = await prisma.client.count({
          where: {
            distributorId: distributor.id,
            isActive: true,
          },
        });

        return {
          ...distributor,
          stats: {
            totalOrders,
            totalSpent,
            clientCount,
          },
        };
      })
    );

    return NextResponse.json({ distributors: distributorsWithStats });
  } catch (error) {
    console.error('Error fetching distributors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distributors' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/distributors
 * Deactivate a distributor (Manager/Owner only)
 */
export async function PATCH(request: Request) {
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

    // Only managers can deactivate distributors
    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { distributorId } = body;

    if (!distributorId) {
      return NextResponse.json({ error: 'Distributor ID required' }, { status: 400 });
    }

    // Verify distributor exists
    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    // Deactivate the distributor
    await prisma.distributor.update({
      where: { id: distributorId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Distributor deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating distributor:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate distributor' },
      { status: 500 }
    );
  }
}
