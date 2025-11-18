import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

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
          // Check if user exists in database
          const user = await prisma.user.findUnique({
            where: { email: data.session.user.email! },
          });

          if (user) {
            // Redirect based on role
            if (user.role === 'MANAGER') {
              return NextResponse.redirect(new URL('/manager/dashboard', request.url));
            } else if (user.role === 'DISTRIBUTOR') {
              return NextResponse.redirect(new URL('/distributor/dashboard', request.url));
            } else if (user.role === 'OWNER') {
              return NextResponse.redirect(new URL('/manager/dashboard', request.url));
            } else if (user.role === 'CLIENT') {
              return NextResponse.redirect(new URL('/client/dashboard', request.url));
            }
          }

          // If user doesn't exist in our DB, create a basic user record
          // For now, redirect to a setup page or login with a message
          return NextResponse.redirect(
            new URL('/login?message=Account created. Please contact administrator to set up your role.', request.url)
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
