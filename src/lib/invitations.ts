import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendInvitationEmail } from '@/lib/email/resend';

// Generate unique invitation token
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create invitation and send email
export async function createAndSendInvitation(
  email: string,
  role: 'DISTRIBUTOR' | 'CLIENT',
  createdBy: string,
  metadata: Record<string, any>,
  invitationUrl: string
): Promise<{ success: boolean; error?: string; invitation?: any }> {
  try {
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
      };
    }

    // Check if invitation already exists and is still valid
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        role,
        accepted: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      return {
        success: false,
        error: 'An active invitation for this email already exists',
      };
    }

    // Create invitation
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        createdBy,
        expiresAt,
        metadata,
      },
    });

    // Create Supabase auth user with temporary password
    // This allows them to later set their own password
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate temporary password
    const tempPassword = crypto.randomBytes(32).toString('hex');

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('Error creating Supabase user:', authError);
      // Delete the invitation if user creation failed
      await prisma.invitation.delete({ where: { id: invitation.id } });
      return {
        success: false,
        error: 'Failed to create user account',
      };
    }

    // Send magic link for automatic login
    const invitationLink = `${invitationUrl}?token=${token}`;

    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: invitationLink,
      },
    });

    if (magicLinkError) {
      console.error('Error generating magic link:', magicLinkError);
    }

    // Get inviter name for email
    const inviter = await prisma.user.findUnique({
      where: { id: createdBy },
      select: { fullName: true, email: true },
    });

    const inviterName = inviter?.fullName || inviter?.email || 'Your administrator';

    // Use magic link URL if available, otherwise use the invitation link
    const emailLink = magicLinkData?.properties?.action_link || invitationLink;

    // Send invitation email via Resend
    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName,
      role,
      invitationLink: emailLink,
      companyName: 'Muchiri Warehouse',
    });

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the invitation creation if email fails
      // Just log it for debugging
    }

    console.log(`Invitation created successfully for ${email}`);
    console.log(`Invitation link: ${invitationLink}`);

    return {
      success: true,
      invitation,
    };
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    return {
      success: false,
      error: error.message || 'Failed to create invitation',
    };
  }
}

// Verify invitation token and get invitation data
export async function getInvitationByToken(
  token: string
): Promise<{ success: boolean; error?: string; invitation?: any }> {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return {
        success: false,
        error: 'Invalid or expired invitation token',
      };
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Invitation has expired',
      };
    }

    // Check if invitation has already been accepted
    if (invitation.accepted) {
      return {
        success: false,
        error: 'Invitation has already been used',
      };
    }

    return {
      success: true,
      invitation,
    };
  } catch (error: any) {
    console.error('Error getting invitation:', error);
    return {
      success: false,
      error: 'Failed to retrieve invitation',
    };
  }
}

// Accept invitation and create user
export async function acceptInvitation(
  token: string,
  userId: string,
  supabaseUser: any
): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return {
        success: false,
        error: 'Invalid or expired invitation',
      };
    }

    if (invitation.expiresAt < new Date() || invitation.accepted) {
      return {
        success: false,
        error: 'Invitation is no longer valid',
      };
    }

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { token },
      data: {
        accepted: true,
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      },
    });

    // Create user record with incomplete profile
    // User will complete their profile (name, phone, password) after clicking the magic link
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: invitation.email,
        fullName: null, // Will be filled in profile completion
        phoneNumber: null, // Will be filled in profile completion
        role: invitation.role,
        profileComplete: false,
      },
    });

    // If role is DISTRIBUTOR, create distributor record
    if (invitation.role === 'DISTRIBUTOR') {
      const businessName = (invitation.metadata as any)?.businessName;
      const phone = (invitation.metadata as any)?.phoneNumber;

      await prisma.distributor.create({
        data: {
          userId: user.id,
          businessName: businessName || 'Pending',
          phoneNumber: phone || '',
        },
      });
    }

    // If role is CLIENT, create client record
    if (invitation.role === 'CLIENT') {
      const businessName = (invitation.metadata as any)?.businessName;
      const phone = (invitation.metadata as any)?.phoneNumber;
      const location = (invitation.metadata as any)?.location;
      const distributorId = (invitation.metadata as any)?.distributorId;

      if (!distributorId) {
        return {
          success: false,
          error: 'Invalid client invitation data',
        };
      }

      await prisma.client.create({
        data: {
          userId: user.id,
          distributorId,
          businessName: businessName || 'Pending',
          phoneNumber: phone || '',
          location: location || '',
        },
      });
    }

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept invitation',
    };
  }
}
