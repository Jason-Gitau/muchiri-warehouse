import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/clients
 * Fetch all clients for the current distributor
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

    // Only distributors and managers can view clients
    if (user.role !== 'DISTRIBUTOR' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let clients;

    if (user.role === 'DISTRIBUTOR') {
      // Get distributor record
      const distributor = await prisma.distributor.findUnique({
        where: { userId: user.id },
      });

      if (!distributor) {
        return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
      }

      // Fetch clients for this distributor
      clients = await prisma.client.findMany({
        where: {
          distributorId: distributor.id,
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
          addedAt: 'desc',
        },
      });
    } else {
      // Managers can see all clients
      clients = await prisma.client.findMany({
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
          distributor: {
            select: {
              businessName: true,
            },
          },
        },
        orderBy: {
          addedAt: 'desc',
        },
      });
    }

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients
 * Deactivate a client (soft delete)
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

    // Only distributors can deactivate their clients
    if (user.role !== 'DISTRIBUTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }

    // Get distributor record
    const distributor = await prisma.distributor.findUnique({
      where: { userId: user.id },
    });

    if (!distributor) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    // Verify this client belongs to the distributor
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        distributorId: distributor.id,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 });
    }

    // Deactivate the client
    await prisma.client.update({
      where: { id: clientId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Client deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating client:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate client' },
      { status: 500 }
    );
  }
}
