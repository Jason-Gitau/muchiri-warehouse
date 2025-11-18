import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/products/available
 * Get products available for clients to order (from their distributor's inventory)
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
      return NextResponse.json({ error: 'Only clients can view available products' }, { status: 403 });
    }

    // Get client record to find their distributor
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }

    // Get distributor's inventory
    const distributorInventory = await prisma.distributorInventory.findMany({
      where: {
        distributorId: client.distributorId,
        quantity: {
          gt: 0, // Only show products in stock
        },
      },
      include: {
        product: {
          where: {
            isActive: true,
          },
        },
      },
    });

    // Filter out items where product is null (inactive products)
    const availableProducts = distributorInventory
      .filter((item) => item.product !== null)
      .map((item) => ({
        id: item.product.id,
        name: item.product.name,
        flavor: item.product.flavor,
        category: item.product.category,
        sku: item.product.sku,
        unitPrice: item.product.unitPrice,
        imageUrl: item.product.imageUrl,
        availableQuantity: item.quantity,
      }));

    return NextResponse.json({
      products: availableProducts,
      distributorId: client.distributorId,
    });
  } catch (error) {
    console.error('Error fetching available products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available products' },
      { status: 500 }
    );
  }
}
