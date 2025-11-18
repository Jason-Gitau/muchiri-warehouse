import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const MarkPaidSchema = z.object({
  paymentNotes: z.string().optional(),
  paymentMethod: z.string().optional(), // e.g., "Cash", "M-Pesa", "Bank Transfer"
});

/**
 * POST /api/orders/[id]/mark-paid
 * Distributor marks a client order as paid (payment happened outside app)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Only distributors can mark client payments
    if (user.role !== 'DISTRIBUTOR') {
      return NextResponse.json(
        { error: 'Only distributors can mark payments' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = MarkPaidSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { paymentNotes, paymentMethod } = validationResult.data;

    // Get distributor record
    const distributor = await prisma.distributor.findUnique({
      where: { userId: user.id },
    });

    if (!distributor) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify this is a client order for this distributor
    if (order.orderType !== 'DISTRIBUTOR_TO_CLIENT') {
      return NextResponse.json(
        { error: 'This endpoint is only for client orders' },
        { status: 400 }
      );
    }

    if (order.distributorId !== distributor.id) {
      return NextResponse.json(
        { error: 'This order does not belong to you' },
        { status: 403 }
      );
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Order is already marked as paid' },
        { status: 400 }
      );
    }

    // Update order and create payment record in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order payment status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: paymentMethod || 'Manual',
        },
      });

      // Create client payment record for tracking
      const clientPayment = await tx.clientPayment.create({
        data: {
          orderId: order.id,
          clientId: order.clientId!,
          distributorId: distributor.id,
          amount: order.totalAmount,
          markedPaidByUserId: user.id,
          paymentNotes: paymentNotes || `Payment marked as received via ${paymentMethod || 'manual entry'}`,
        },
      });

      return { order: updatedOrder, payment: clientPayment };
    });

    return NextResponse.json({
      message: 'Order marked as paid successfully',
      order: result.order,
    });
  } catch (error: any) {
    console.error('Error marking order as paid:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark order as paid' },
      { status: 500 }
    );
  }
}
