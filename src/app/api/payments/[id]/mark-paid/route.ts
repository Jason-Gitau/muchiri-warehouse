import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ManagerMarkPaidSchema = z.object({
  paymentMethod: z.string().min(1),
  notes: z.string().optional(),
});

/**
 * POST /api/payments/[id]/mark-paid
 * Manager manually marks a warehouse order as paid
 * Used when payment happens outside the system or M-Pesa fails
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only managers and owners can mark warehouse payments
    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only managers can mark warehouse payments' },
        { status: 403 }
      );
    }

    const { id: orderId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = ManagerMarkPaidSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { paymentMethod, notes } = validationResult.data;

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify this is a warehouse order
    if (order.orderType !== 'WAREHOUSE_TO_DISTRIBUTOR') {
      return NextResponse.json(
        { error: 'This endpoint is only for warehouse orders' },
        { status: 400 }
      );
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Order is already marked as paid' },
        { status: 400 }
      );
    }

    // Update order and create/update payment record in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order payment status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: paymentMethod,
        },
      });

      // Try to find existing payment record
      let paymentRecord = await tx.payment.findUnique({
        where: { orderId },
      });

      if (paymentRecord) {
        // Update existing payment record
        paymentRecord = await tx.payment.update({
          where: { orderId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paymentMethod: paymentMethod,
          },
        });
      } else {
        // Create new payment record
        paymentRecord = await tx.payment.create({
          data: {
            orderId,
            amount: order.totalAmount,
            paymentMethod: paymentMethod,
            status: 'PAID',
            paidAt: new Date(),
          },
        });
      }

      return { order: updatedOrder, payment: paymentRecord };
    });

    return NextResponse.json({
      message: 'Payment marked as paid successfully',
      order: result.order,
      payment: result.payment,
    });
  } catch (error: any) {
    console.error('Error marking payment as paid:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark payment as paid' },
      { status: 500 }
    );
  }
}
