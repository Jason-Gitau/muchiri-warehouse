import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the auth session from cookies
  let supabaseResponse = NextResponse.next({
    request,
  });

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

  // If user is not authenticated, redirect to login
  if (!user) {
    // Allow public pages without authentication
    if (pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname.startsWith('/setup/owner')) {
      return supabaseResponse;
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fetch user role from database
  const { data: userData } = await supabase
    .from('User')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = userData?.role;

  // Get the first segment of the path
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];

  // Protected routes that require role-based access
  const protectedRoutes: Record<string, string[]> = {
    dashboard: ['OWNER', 'MANAGER', 'DISTRIBUTOR', 'CLIENT'],
    inventory: ['MANAGER', 'DISTRIBUTOR'],
    orders: ['MANAGER', 'DISTRIBUTOR', 'CLIENT'],
    products: ['MANAGER', 'DISTRIBUTOR', 'CLIENT'],
    'client-management': ['DISTRIBUTOR'],
    analytics: ['OWNER'],
  };

  // Check if the route requires specific roles
  if (protectedRoutes[firstSegment]) {
    if (!userRole || !protectedRoutes[firstSegment].includes(userRole)) {
      // Redirect to appropriate dashboard based on role
      const roleToPath: Record<string, string> = {
        OWNER: '/dashboard',
        MANAGER: '/dashboard',
        DISTRIBUTOR: '/dashboard',
        CLIENT: '/dashboard',
      };
      return NextResponse.redirect(new URL(roleToPath[userRole] || '/login', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
