import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/payments
 * Fetch all payments with filters for Manager payment verification
 * Includes both warehouse-to-distributor payments and client payments
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

    // Only managers and owners can view all payments
    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const paymentStatus = searchParams.get('paymentStatus');
    const distributorId = searchParams.get('distributorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentType = searchParams.get('paymentType'); // 'warehouse' or 'client'

    // Fetch warehouse-to-distributor orders with payment info
    const warehouseOrdersWhere: any = {
      orderType: 'WAREHOUSE_TO_DISTRIBUTOR',
    };

    if (paymentStatus) {
      warehouseOrdersWhere.paymentStatus = paymentStatus;
    }

    if (distributorId) {
      warehouseOrdersWhere.distributorId = distributorId;
    }

    if (startDate) {
      warehouseOrdersWhere.createdAt = {
        ...warehouseOrdersWhere.createdAt,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      warehouseOrdersWhere.createdAt = {
        ...warehouseOrdersWhere.createdAt,
        lte: new Date(endDate),
      };
    }

    let warehousePayments: any[] = [];
    if (!paymentType || paymentType === 'warehouse') {
      const warehouseOrders = await prisma.order.findMany({
        where: warehouseOrdersWhere,
        orderBy: { createdAt: 'desc' },
      });

      // Enrich with distributor and payment details
      warehousePayments = await Promise.all(
        warehouseOrders.map(async (order) => {
          let distributor = null;
          if (order.distributorId) {
            distributor = await prisma.distributor.findUnique({
              where: { id: order.distributorId },
            });
          }

          // Try to get M-Pesa payment details
          let mpesaDetails = null;
          try {
            mpesaDetails = await prisma.payment.findUnique({
              where: { orderId: order.id },
            });
          } catch (e) {
            // Payment record might not exist
          }

          return {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: 'WAREHOUSE_TO_DISTRIBUTOR',
            distributorId: order.distributorId,
            distributorName: distributor?.businessName || 'Unknown',
            amount: order.totalAmount,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod || 'N/A',
            createdAt: order.createdAt,
            mpesaPhoneNumber: mpesaDetails?.mpesaPhoneNumber,
            mpesaTransactionId: mpesaDetails?.mpesaTransactionId,
            mpesaReceiptNumber: mpesaDetails?.mpesaReceiptNumber,
            paidAt: mpesaDetails?.paidAt,
          };
        })
      );
    }

    // Fetch client payments if requested
    let clientPayments: any[] = [];
    if (!paymentType || paymentType === 'client') {
      const clientPaymentsWhere: any = {};

      if (distributorId) {
        clientPaymentsWhere.distributorId = distributorId;
      }

      if (startDate) {
        clientPaymentsWhere.markedPaidAt = {
          ...clientPaymentsWhere.markedPaidAt,
          gte: new Date(startDate),
        };
      }

      if (endDate) {
        clientPaymentsWhere.markedPaidAt = {
          ...clientPaymentsWhere.markedPaidAt,
          lte: new Date(endDate),
        };
      }

      const clientPaymentRecords = await prisma.clientPayment.findMany({
        where: clientPaymentsWhere,
        orderBy: { markedPaidAt: 'desc' },
      });

      // Enrich with order, distributor, and client details
      clientPayments = await Promise.all(
        clientPaymentRecords.map(async (payment) => {
          const order = await prisma.order.findUnique({
            where: { id: payment.orderId },
          });

          const distributor = await prisma.distributor.findUnique({
            where: { id: payment.distributorId },
          });

          const client = await prisma.client.findUnique({
            where: { id: payment.clientId },
          });

          return {
            id: payment.id,
            orderNumber: order?.orderNumber || 'N/A',
            orderType: 'DISTRIBUTOR_TO_CLIENT',
            distributorId: payment.distributorId,
            distributorName: distributor?.businessName || 'Unknown',
            clientName: client?.businessName || 'Unknown',
            amount: payment.amount,
            paymentStatus: 'PAID',
            paymentMethod: 'Manual',
            paymentNotes: payment.paymentNotes,
            createdAt: payment.markedPaidAt,
            paidAt: payment.markedPaidAt,
          };
        })
      );
    }

    // Combine and sort all payments
    const allPayments = [...warehousePayments, ...clientPayments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ payments: allPayments });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
