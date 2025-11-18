import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export default async function Home() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not logged in, redirect to login
  if (!session) {
    redirect('/login');
  }

  // Get user role from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  // Redirect based on role
  if (user) {
    if (user.role === 'MANAGER' || user.role === 'OWNER') {
      redirect('/manager/dashboard');
    } else if (user.role === 'DISTRIBUTOR') {
      redirect('/distributor/dashboard');
    }
  }

  // Default redirect to login
  redirect('/login');
}
