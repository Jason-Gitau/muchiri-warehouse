import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/orders/my-orders
 * Get all orders for the current client
 */
export async function GET(request: NextRequest) {
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

    // Only clients can use this endpoint
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only clients can view their orders' }, { status: 403 });
    }

    // Get client record
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }

    // Parse filters from query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {
      clientId: client.id,
      orderType: 'DISTRIBUTOR_TO_CLIENT',
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = {
        ...where.createdAt,
        lte: end,
      };
    }

    // Fetch orders with details
    const orders = await prisma.order.findMany({
      where,
      include: {
        orderItem: {
          include: {
            product: {
              select: {
                name: true,
                flavor: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get distributor info
    const distributor = await prisma.distributor.findUnique({
      where: { id: client.distributorId },
      select: {
        businessName: true,
        phoneNumber: true,
        location: true,
      },
    });

    return NextResponse.json({
      orders,
      distributor,
    });
  } catch (error) {
    console.error('Error fetching client orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
