import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAndSendInvitation } from '@/lib/invitations';
import { z } from 'zod';

// Validation schema
const InviteDistributorSchema = z.object({
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number'),
});

// POST /api/distributors/invite - Send invitation to become distributor
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    let supabaseResponse = NextResponse.next({ request });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = InviteDistributorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, businessName, phoneNumber } = validation.data;

    // Create invitation
    const result = await createAndSendInvitation(
      email,
      'DISTRIBUTOR',
      user.id,
      { businessName, phoneNumber },
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: result.invitation,
    });
  } catch (error: any) {
    console.error('Error sending distributor invitation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
