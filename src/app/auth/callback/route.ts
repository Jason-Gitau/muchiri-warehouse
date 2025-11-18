import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acceptInvitation } from '@/lib/invitations';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const invitationToken = requestUrl.searchParams.get('token');

  if (code) {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth error:', error);
        return NextResponse.redirect(new URL('/login?error=Authentication failed', request.url));
      }

      if (data.session) {
        try {
          // If invitation token exists, accept the invitation and create user with proper role
          if (invitationToken) {
            const result = await acceptInvitation(
              invitationToken,
              data.session.user.id,
              data.session.user
            );

            if (!result.success) {
              console.error('Invitation acceptance error:', result.error);
              return NextResponse.redirect(
                new URL(`/login?error=${encodeURIComponent(result.error || 'Invalid invitation')}`, request.url)
              );
            }

            // New user created via invitation - redirect to complete profile
            // Profile will be incomplete since we only set email and role during invitation acceptance
            return NextResponse.redirect(new URL('/onboarding/complete-profile', request.url));
          }

          // No invitation token - check if user exists in database
          const user = await prisma.user.findUnique({
            where: { email: data.session.user.email! },
          });

          if (user) {
            // Check if profile is complete
            if (!user.profileComplete) {
              return NextResponse.redirect(new URL('/onboarding/complete-profile', request.url));
            }

            // Profile complete - redirect to dashboard
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }

          // If user doesn't exist in our DB, redirect to an error page
          return NextResponse.redirect(
            new URL('/login?error=Invalid invitation or session expired', request.url)
          );
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Auth succeeded but DB query failed - still allow login but redirect to home
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.redirect(new URL('/login?error=Something went wrong', request.url));
    }
  }

  // Return the user to the login page if there's no code
  return NextResponse.redirect(new URL('/login', request.url));
}
