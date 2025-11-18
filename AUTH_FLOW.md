# Authentication Flow Documentation

## Overview

This application now features a **seamless authentication system** that combines **email/password login** with **magic link invitations** for smooth user onboarding.

## Key Features

✅ **Email/Password Login** - Fast, familiar login for returning users
✅ **Magic Link Invitations** - One-click onboarding for new users
✅ **Profile Completion Flow** - Guided setup after first login
✅ **Password Reset** - Self-service password recovery
✅ **Logout Functionality** - Clean session termination
✅ **Email Notifications** - Professional invitation emails via Resend
✅ **Role-Based Access** - Automatic routing based on user role

---

## User Flows

### 1. New User Invitation Flow

**For Distributors/Clients being invited:**

```
1. Admin sends invitation
   ↓
2. User receives email with magic link
   ↓
3. User clicks magic link → Auto-authenticated
   ↓
4. Redirected to /onboarding/complete-profile
   ↓
5. User fills in:
   - Full Name
   - Phone Number
   - Password (set their own secure password)
   ↓
6. Submit → Redirected to /dashboard
   ↓
7. Future logins use email + password (no more emails!)
```

**Key Benefits:**
- ✅ No waiting for emails on subsequent logins
- ✅ One-time setup with magic link
- ✅ User sets their own memorable password
- ✅ Immediate access to the platform

---

### 2. Returning User Login Flow

**For users who have completed their profile:**

```
1. Go to /login
   ↓
2. Enter email + password
   ↓
3. Click "Sign In"
   ↓
4. Instant redirect to /dashboard
```

**Benefits:**
- ⚡ Instant login (no email waiting)
- 🔒 Secure password-based authentication
- 💪 Standard, familiar UX

---

### 3. Password Reset Flow

**For users who forgot their password:**

```
1. Click "Forgot password?" on login page
   ↓
2. Enter email address
   ↓
3. Receive password reset link via email
   ↓
4. Click link → Redirected to /auth/reset-password
   ↓
5. Enter new password + confirm
   ↓
6. Submit → Redirected to /login
   ↓
7. Login with new password
```

---

## Technical Implementation

### Database Schema Changes

**User Model:**
```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  fullName        String?  // Now optional (filled during profile completion)
  phoneNumber     String?  // Now optional (filled during profile completion)
  role            UserRole
  profileComplete Boolean  @default(false) // NEW: Tracks setup status
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([email])
  @@index([role])
  @@index([profileComplete]) // NEW: Index for quick lookup
}
```

**Migration:**
```sql
-- Run this migration to update existing database
ALTER TABLE "User" ALTER COLUMN "fullName" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "profileComplete" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "User_profileComplete_idx" ON "User"("profileComplete");
```

---

### Key Components

#### 1. Login Page (`/login`)
- **Location:** `src/app/(auth)/login/page.tsx`
- **Features:**
  - Email + Password form
  - Password visibility toggle
  - "Forgot Password" link
  - Error handling with user-friendly messages
  - Modern, responsive design

#### 2. Profile Completion Page (`/onboarding/complete-profile`)
- **Location:** `src/app/onboarding/complete-profile/page.tsx`
- **Features:**
  - Pre-filled email (from session)
  - Full Name input
  - Phone Number input (with validation)
  - Password creation (with confirmation)
  - Sets `profileComplete = true` on submit

#### 3. Auth Callback Handler (`/auth/callback`)
- **Location:** `src/app/auth/callback/route.ts`
- **Logic:**
  ```typescript
  if (invitationToken exists) {
    // New user via invitation
    acceptInvitation()
    redirect to /onboarding/complete-profile
  } else {
    // Existing user login
    if (!user.profileComplete) {
      redirect to /onboarding/complete-profile
    } else {
      redirect to /dashboard
    }
  }
  ```

#### 4. Password Reset Pages
- **Forgot Password:** `src/app/auth/forgot-password/page.tsx`
- **Reset Password:** `src/app/auth/reset-password/page.tsx`
- Uses Supabase's built-in password reset functionality

#### 5. Logout Component
- **Location:** `src/components/auth/LogoutButton.tsx`
- **Features:**
  - Reusable button component
  - Multiple variants (default, ghost, danger)
  - Handles Supabase sign out
  - Redirects to login page

---

### API Endpoints

#### Complete Profile
```typescript
POST /api/user/complete-profile
Body: {
  fullName: string,
  phoneNumber: string
}

Response: {
  message: 'Profile completed successfully',
  user: { id, email, fullName, phoneNumber, role }
}
```

#### Logout
```typescript
POST /api/auth/logout

Response: {
  message: 'Logged out successfully'
}
```

---

### Email Integration (Resend)

**Setup:**
1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=onboarding@yourdomain.com
   ```

**Email Service:**
- **Location:** `src/lib/email/resend.ts`
- **Function:** `sendInvitationEmail()`
- **Features:**
  - Professional HTML email template
  - Personalized inviter name
  - Role-specific messaging
  - Clear call-to-action button
  - Expiration notice

**Email Template Includes:**
- Company branding
- Invitation details
- "What happens next?" guide
- Magic link button
- Expiration warning (7 days)

---

### Invitation System Updates

**Location:** `src/lib/invitations.ts`

**New Flow:**
1. Create invitation record in database
2. Create Supabase auth user with temporary password
3. Generate magic link for auto-authentication
4. Send branded email via Resend
5. User clicks link → auto-authenticated → profile completion

**Key Functions:**
- `createAndSendInvitation()` - Creates user + sends email
- `acceptInvitation()` - Creates User record with `profileComplete: false`
- `getInvitationByToken()` - Validates invitation tokens

---

## Environment Variables

**Complete `.env.local` setup:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Configuration
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@yourdomain.com
```

---

## Security Features

### 1. Password Requirements
- Minimum 8 characters
- Confirmation required
- Supabase handles hashing/salting

### 2. Session Management
- Supabase handles JWT tokens
- Automatic token refresh
- Secure cookie storage

### 3. Invitation Security
- Cryptographically secure tokens (32 bytes)
- 7-day expiration
- One-time use (marked as accepted)
- Email validation

### 4. Role-Based Access Control
- Middleware enforces route permissions
- Automatic redirection based on role
- See `src/middleware.ts` for routing rules

---

## Testing the Flow

### 1. Test New User Invitation

```bash
# Step 1: Create an invitation (as admin/distributor)
# Through the app UI or API

# Step 2: Check console logs for magic link
# Copy the invitation link

# Step 3: Open link in browser
# Should redirect to /onboarding/complete-profile

# Step 4: Fill in profile details
# Full Name: "John Doe"
# Phone: "+254712345678"
# Password: "SecurePass123"

# Step 5: Verify redirect to /dashboard

# Step 6: Logout

# Step 7: Login with email + password
# Should work instantly without emails!
```

### 2. Test Password Reset

```bash
# Step 1: Go to /login
# Click "Forgot password?"

# Step 2: Enter your email
# Click "Send Reset Link"

# Step 3: Check email for reset link
# Click the link

# Step 4: Set new password
# Enter password twice

# Step 5: Verify redirect to /login

# Step 6: Login with new password
```

---

## Migration Guide

### For Existing Users

If you have existing users in your database, you'll need to:

1. **Run the migration:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Update existing users:**
   ```sql
   -- Mark all existing users as having complete profiles
   UPDATE "User" SET "profileComplete" = true WHERE "fullName" IS NOT NULL;
   ```

3. **Set passwords for existing users:**
   - Option A: Send password reset emails to all users
   - Option B: Force profile completion on next login

---

## Troubleshooting

### Issue: "Profile not complete" loop
**Solution:** Check that the API endpoint `/api/user/complete-profile` is updating `profileComplete: true`

### Issue: Magic links not working
**Solution:**
1. Verify Supabase service role key is set
2. Check redirect URL matches your app URL
3. Ensure email is confirmed in Supabase

### Issue: Emails not sending
**Solution:**
1. Verify `RESEND_API_KEY` is set correctly
2. Check `RESEND_FROM_EMAIL` is a verified domain
3. Check console logs for Resend errors

### Issue: Users can't login after completing profile
**Solution:**
1. Verify password was set in Supabase
2. Check user exists in both Supabase Auth and your database
3. Try password reset flow

---

## Future Enhancements

### Possible Improvements:

1. **Multi-Factor Authentication (2FA)**
   - Add optional 2FA for sensitive roles (OWNER, MANAGER)
   - Use Supabase's MFA features

2. **OAuth Providers**
   - Add Google/Microsoft login
   - Link existing accounts

3. **Email Verification**
   - Track email verification status
   - Require verification before access

4. **Session Management**
   - "Remember me" functionality
   - Device management

5. **Audit Logging**
   - Track login attempts
   - Log authentication events

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code in:
   - `src/app/(auth)/login/page.tsx`
   - `src/app/auth/callback/route.ts`
   - `src/lib/invitations.ts`
3. Check Supabase logs for auth errors
4. Verify all environment variables are set

---

## Summary

This authentication system provides:
- ✅ **Seamless onboarding** via magic links
- ✅ **Fast login** via email/password
- ✅ **Self-service** password reset
- ✅ **Professional emails** via Resend
- ✅ **Secure** role-based access
- ✅ **User-friendly** error handling

All while maintaining security best practices and providing an excellent user experience!
