import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/setup/owner/check - Check if owner already exists
export async function GET() {
  try {
    // Check if any user with OWNER role exists
    const ownerUser = await prisma.user.findFirst({
      where: { role: 'OWNER' },
    });

    return NextResponse.json({
      ownerExists: !!ownerUser,
    });
  } catch (error: any) {
    console.error('Error checking owner status:', error);
    return NextResponse.json(
      { error: 'Failed to check owner status' },
      { status: 500 }
    );
  }
}
