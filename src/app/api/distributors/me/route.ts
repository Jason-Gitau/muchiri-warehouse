import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get distributor record
    const distributor = await prisma.distributor.findUnique({
      where: { userId: user.id },
    });

    if (!distributor) {
      return NextResponse.json(
        { error: 'Distributor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ distributor });
  } catch (error) {
    console.error('Error fetching distributor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distributor' },
      { status: 500 }
    );
  }
}
