import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InvitationEmailData {
  to: string;
  inviterName: string;
  role: string;
  invitationLink: string;
  companyName?: string;
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  const { to, inviterName, role, invitationLink, companyName = 'Muchiri Warehouse' } = data;

  const roleDisplay = role === 'DISTRIBUTOR' ? 'Distributor' : 'Client';

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject: `You've been invited to join ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation to ${companyName}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 40px; margin-bottom: 24px;">
                <div style="text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 12px 0; font-weight: 700;">
                    ${companyName}
                  </h1>
                  <p style="color: #93c5fd; font-size: 14px; margin: 0;">
                    Warehouse Management System
                  </p>
                </div>
              </div>

              <!-- Main Content -->
              <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 16px 0; font-weight: 700;">
                  You've Been Invited!
                </h2>

                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  ${inviterName} has invited you to join <strong>${companyName}</strong> as a <strong>${roleDisplay}</strong>.
                </p>

                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                  Click the button below to accept your invitation and complete your profile setup:
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${invitationLink}"
                     style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                    Accept Invitation
                  </a>
                </div>

                <!-- Instructions -->
                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 32px 0 0 0;">
                  <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                    What happens next?
                  </h3>
                  <ol style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Click the invitation link above</li>
                    <li style="margin-bottom: 8px;">Complete your profile with your name and phone number</li>
                    <li style="margin-bottom: 8px;">Set a secure password for your account</li>
                    <li>Start managing your inventory and orders!</li>
                  </ol>
                </div>

                <!-- Link Expiry Notice -->
                <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                  <strong>Note:</strong> This invitation link will expire in 7 days. If you don't accept it within this time, please contact ${inviterName} for a new invitation.
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 32px; padding: 20px;">
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
                <p style="color: #cbd5e1; font-size: 12px; margin: 16px 0 0 0;">
                  © 2024 ${companyName}. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: emailData };
  } catch (error: any) {
    console.error('Failed to send invitation email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
