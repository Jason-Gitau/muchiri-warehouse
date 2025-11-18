import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
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
        }
      }

      // If user doesn't exist, redirect to login with error
      return NextResponse.redirect(
        new URL('/login?error=User not found. Please contact administrator.', request.url)
      );
    }
  }

  // Return the user to the login page if there's an error
  return NextResponse.redirect(new URL('/login', request.url));
}
