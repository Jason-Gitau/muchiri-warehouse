import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { ProductSchema } from '@/types';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Get warehouse inventory for each product
    const productsWithInventory = await Promise.all(
      products.map(async (product) => {
        const warehouseInventory = await prisma.warehouseInventory.findMany({
          where: { productId: product.id },
        });
        return {
          ...product,
          warehouseInventory,
        };
      })
    );

    return NextResponse.json({ products: productsWithInventory });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = ProductSchema.parse(body);

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || (user.role !== 'MANAGER' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get warehouse ID (for MVP, we'll use the first warehouse)
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      return NextResponse.json({ error: 'No warehouse found' }, { status: 404 });
    }

    // Create product and inventory in transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: validated.name,
          flavor: validated.flavor,
          category: validated.category,
          sku: validated.sku,
          unitPrice: validated.unitPrice,
          imageUrl: validated.imageUrl || null,
        },
      });

      const inventory = await tx.warehouseInventory.create({
        data: {
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: validated.initialStock,
          reorderLevel: validated.reorderLevel,
          lastRestockedAt: new Date(),
        },
      });

      // Create initial inventory transaction
      await tx.inventoryTransaction.create({
        data: {
          warehouseId: warehouse.id,
          productId: product.id,
          transactionType: 'RESTOCK',
          quantityChange: validated.initialStock,
          balanceAfter: validated.initialStock,
          performedByUserId: user.id,
          notes: 'Initial stock',
        },
      });

      return { product, inventory };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
