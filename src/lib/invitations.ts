import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

    // Send invitation email
    const invitationLink = `${invitationUrl}?token=${token}`;

    // TODO: Send email via Resend/SendGrid
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

    // Create user record
    const fullName = (invitation.metadata as any)?.businessName || supabaseUser.email;
    const phoneNumber = (invitation.metadata as any)?.phoneNumber;

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: invitation.email,
        fullName,
        phoneNumber,
        role: invitation.role,
      },
    });

    // If role is DISTRIBUTOR, create distributor record
    if (invitation.role === 'DISTRIBUTOR') {
      const businessName = (invitation.metadata as any)?.businessName;
      const phone = (invitation.metadata as any)?.phoneNumber;

      await prisma.distributor.create({
        data: {
          userId: user.id,
          businessName: businessName || user.fullName,
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
          businessName: businessName || user.fullName,
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
