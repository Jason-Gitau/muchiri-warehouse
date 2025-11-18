import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Validation schema
const CreateOwnerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number'),
});

// POST /api/setup/owner - Create owner account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = CreateOwnerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fullName, email, phoneNumber } = validation.data;

    // Check if owner already exists
    const existingOwner = await prisma.user.findFirst({
      where: { role: 'OWNER' },
    });

    if (existingOwner) {
      return NextResponse.json(
        { error: 'An owner account already exists' },
        { status: 409 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create Supabase user (this will be linked when they click the magic link)
    // For now, we'll create them with a placeholder auth that will be replaced
    // when they authenticate via magic link in the auth callback

    // Create User record in database
    const newOwner = await prisma.user.create({
      data: {
        id: `owner-${Date.now()}`, // Temporary ID, will be replaced by Supabase ID in auth callback
        email,
        fullName,
        phoneNumber,
        role: 'OWNER',
      },
    });

    // Send magic link for the owner to verify their email
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: signUpError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        phone_number: phoneNumber,
      },
    });

    if (signUpError) {
      // If auth creation fails, delete the database record
      await prisma.user.delete({
        where: { id: newOwner.id },
      });

      return NextResponse.json(
        { error: 'Failed to create authentication account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Owner account created. Please check your email for a verification link.',
      owner: {
        id: newOwner.id,
        email: newOwner.email,
        fullName: newOwner.fullName,
        role: newOwner.role,
      },
    });
  } catch (error: any) {
    console.error('Error creating owner:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create owner account' },
      { status: 500 }
    );
  }
}
