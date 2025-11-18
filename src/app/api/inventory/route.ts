import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// GET /api/inventory - List all warehouse inventory with product details
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

    // Only managers, owners, and distributors can view inventory
    if (user.role !== 'MANAGER' && user.role !== 'OWNER' && user.role !== 'DISTRIBUTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Get first warehouse (for MVP, we assume single warehouse)
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      return NextResponse.json(
        { error: 'No warehouse found' },
        { status: 500 }
      );
    }

    // Build where clause for filtering
    const where: any = {
      warehouseId: warehouse.id,
    };

    // Fetch all inventory items for the warehouse
    const inventoryItems = await prisma.warehouseInventory.findMany({
      where,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Fetch product details for each inventory item
    const inventoryWithProducts = await Promise.all(
      inventoryItems.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        return {
          ...item,
          product,
          isLowStock: item.quantity < item.reorderLevel,
        };
      })
    );

    // Apply filters
    let filteredInventory = inventoryWithProducts;

    if (lowStockOnly) {
      filteredInventory = filteredInventory.filter(item => item.isLowStock);
    }

    if (category && category !== 'all') {
      filteredInventory = filteredInventory.filter(
        item => item.product?.category === category
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredInventory = filteredInventory.filter(
        item =>
          item.product?.name.toLowerCase().includes(searchLower) ||
          item.product?.sku.toLowerCase().includes(searchLower) ||
          item.product?.flavor.toLowerCase().includes(searchLower)
      );
    }

    // Sort low stock items to the top
    filteredInventory.sort((a, b) => {
      if (a.isLowStock && !b.isLowStock) return -1;
      if (!a.isLowStock && b.isLowStock) return 1;
      return 0;
    });

    return NextResponse.json({
      warehouse,
      inventory: filteredInventory,
      totalItems: filteredInventory.length,
      lowStockCount: filteredInventory.filter(item => item.isLowStock).length,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
