# M-Pesa Integration Guide

Complete guide for implementing M-Pesa Daraja API payment integration for warehouse-to-distributor transactions.

---

## Overview

**Scope:** M-Pesa payments are ONLY used for Warehouse → Distributor orders.

**Key Features:**
- STK Push (Lipa Na M-Pesa Online) - Payment prompt on customer's phone
- Callback handling - Automatic payment confirmation
- Query API - Fallback for delayed callbacks
- Sandbox and Production environments

**Payment Flow:**
1. Distributor places order
2. System initiates STK Push
3. Distributor enters M-Pesa PIN on phone
4. M-Pesa processes payment
5. Callback updates order status
6. Email confirmation sent

---

## Prerequisites

### 1. M-Pesa Daraja API Account

**Sign Up:**
1. Go to https://developer.safaricom.co.ke
2. Click "Sign Up" (top right)
3. Fill in details:
   - Name
   - Email
   - Phone number (must be Safaricom number for testing)
4. Verify email
5. Login to dashboard

### 2. Create Daraja App

**Steps:**
1. Login to developer portal
2. Go to "My Apps"
3. Click "Create New App"
4. Fill in:
   - App Name: "Muchiri Warehouse"
   - Description: "Warehouse supply chain management"
5. Select APIs:
   - ✅ Lipa Na M-Pesa Online
6. Click "Create App"
7. Copy credentials:
   - Consumer Key
   - Consumer Secret

### 3. Get Test Credentials (Sandbox)

**Shortcode & Passkey:**
1. Go to "APIs" → "Lipa Na M-Pesa Online"
2. Click "Test Credentials"
3. Copy:
   - Business Short Code: `174379` (sandbox default)
   - Passkey: (long string provided)

**Test Phone Numbers:**
- Format: `254XXXXXXXXX` (Kenya country code + 9 digits)
- Example: `254712345678`
- Use your Safaricom number for testing

---

## Environment Variables

Add to `.env.local`:

```bash
# M-Pesa Daraja API
MPESA_CONSUMER_KEY=your_consumer_key_from_daraja
MPESA_CONSUMER_SECRET=your_consumer_secret_from_daraja
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_passkey_from_test_credentials
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox

# For production, change to:
# MPESA_ENVIRONMENT=production
# MPESA_BUSINESS_SHORT_CODE=your_production_shortcode
# MPESA_PASSKEY=your_production_passkey
```

**Important:**
- Never commit these to Git
- Add `.env.local` to `.gitignore`
- Use different credentials for sandbox and production

---

## Implementation

### 1. M-Pesa Configuration

`src/lib/mpesa/config.ts`:

```typescript
export const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE!,
  passkey: process.env.MPESA_PASSKEY!,
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  baseUrl:
    process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke',
};

// Validate required env vars
const requiredVars = [
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_BUSINESS_SHORT_CODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL',
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

---

### 2. Authentication (Access Token)

M-Pesa requires an OAuth access token for all API calls. Tokens expire after 1 hour.

`src/lib/mpesa/auth.ts`:

```typescript
import axios from 'axios';
import { mpesaConfig } from './config';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getMpesaAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  // Generate new token
  const auth = Buffer.from(
    `${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`
  ).toString('base64');

  try {
    const response = await axios.get(
      `${mpesaConfig.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const token = response.data.access_token;
    const expiresIn = parseInt(response.data.expires_in) * 1000; // Convert to ms

    // Cache token (subtract 1 minute for safety margin)
    cachedToken = {
      token,
      expiresAt: Date.now() + expiresIn - 60000,
    };

    return token;
  } catch (error: any) {
    console.error('M-Pesa auth error:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
}
```

**Why Caching:**
- Reduces API calls
- Improves performance
- Avoids rate limits

---

### 3. STK Push (Initiate Payment)

`src/app/api/mpesa/stk-push/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getMpesaAccessToken } from '@/lib/mpesa/auth';
import { mpesaConfig } from '@/lib/mpesa/config';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const stkPushSchema = z.object({
  orderId: z.string().uuid(),
  phoneNumber: z.string().regex(/^254\d{9}$/, 'Invalid phone number format'),
  amount: z.number().positive().max(150000), // Max KES 150,000 per transaction
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { orderId, phoneNumber, amount } = stkPushSchema.parse(body);

    // Verify order exists and is unpaid
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        distributor: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
    }

    // Get M-Pesa access token
    const accessToken = await getMpesaAccessToken();

    // Generate timestamp (YYYYMMDDHHmmss)
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14);

    // Generate password
    // Password = Base64(ShortCode + Passkey + Timestamp)
    const password = Buffer.from(
      `${mpesaConfig.businessShortCode}${mpesaConfig.passkey}${timestamp}`
    ).toString('base64');

    // Prepare STK Push request
    const stkPushPayload = {
      BusinessShortCode: mpesaConfig.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(amount), // Must be integer
      PartyA: phoneNumber, // Customer phone number
      PartyB: mpesaConfig.businessShortCode, // Shortcode receiving payment
      PhoneNumber: phoneNumber, // Phone to receive STK prompt
      CallBackURL: mpesaConfig.callbackUrl,
      AccountReference: order.orderNumber, // Shows on customer's phone
      TransactionDesc: `Payment for Order ${order.orderNumber}`, // Description
    };

    // Make STK Push request
    const response = await axios.post(
      `${mpesaConfig.baseUrl}/mpesa/stkpush/v1/processrequest`,
      stkPushPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { CheckoutRequestID, MerchantRequestID, ResponseCode, ResponseDescription, CustomerMessage } =
      response.data;

    // Check if request was accepted
    if (ResponseCode !== '0') {
      return NextResponse.json(
        { error: ResponseDescription || 'STK Push failed' },
        { status: 400 }
      );
    }

    // Create or update payment record
    await prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount,
        paymentMethod: 'M-PESA',
        mpesaPhoneNumber: phoneNumber,
        mpesaTransactionId: CheckoutRequestID,
        status: 'PENDING',
      },
      update: {
        mpesaPhoneNumber: phoneNumber,
        mpesaTransactionId: CheckoutRequestID,
        status: 'PENDING',
      },
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'PENDING' },
    });

    return NextResponse.json({
      success: true,
      CheckoutRequestID,
      MerchantRequestID,
      ResponseDescription,
      CustomerMessage,
    });
  } catch (error: any) {
    console.error('STK Push error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    if (axios.isAxiosError(error)) {
      const mpesaError = error.response?.data;
      console.error('M-Pesa API error:', mpesaError);
      return NextResponse.json(
        { error: mpesaError?.errorMessage || 'Payment initiation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Key Points:**
- Phone number must be in format `254XXXXXXXXX` (Kenya only)
- Amount must be integer (no decimals)
- Password is Base64 encoded
- CheckoutRequestID is used to track payment

---

### 4. Callback Handler (Payment Confirmation)

M-Pesa sends callback when payment is completed (success or failure).

`src/app/api/mpesa/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

    // Extract callback data
    const { Body } = body;
    if (!Body || !Body.stkCallback) {
      return NextResponse.json({ error: 'Invalid callback format' }, { status: 400 });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = Body.stkCallback;

    // Find payment by CheckoutRequestID
    const payment = await prisma.payment.findFirst({
      where: { mpesaTransactionId: CheckoutRequestID },
      include: {
        order: {
          include: {
            distributor: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      console.error('Payment not found for CheckoutRequestID:', CheckoutRequestID);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // ResultCode 0 = Success, anything else = Failure
    if (ResultCode === 0) {
      // Payment successful
      // Extract metadata
      let amount = 0;
      let mpesaReceiptNumber = '';
      let transactionDate = '';
      let phoneNumber = '';

      if (CallbackMetadata && CallbackMetadata.Item) {
        CallbackMetadata.Item.forEach((item: any) => {
          switch (item.Name) {
            case 'Amount':
              amount = item.Value;
              break;
            case 'MpesaReceiptNumber':
              mpesaReceiptNumber = item.Value;
              break;
            case 'TransactionDate':
              transactionDate = item.Value;
              break;
            case 'PhoneNumber':
              phoneNumber = item.Value;
              break;
          }
        });
      }

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          mpesaReceiptNumber,
          paidAt: new Date(),
        },
      });

      // Update order
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          mpesaTransactionId: mpesaReceiptNumber,
        },
      });

      // Send email confirmation
      await sendEmail({
        to: payment.order.distributor.user.email,
        template: 'payment-confirmed',
        data: {
          orderNumber: payment.order.orderNumber,
          amount: amount,
          mpesaReceiptNumber,
          distributorName: payment.order.distributor.user.fullName,
        },
      });

      console.log(`Payment successful for order ${payment.order.orderNumber}`);
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
        },
      });

      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'FAILED',
        },
      });

      // Send failure email
      await sendEmail({
        to: payment.order.distributor.user.email,
        template: 'payment-failed',
        data: {
          orderNumber: payment.order.orderNumber,
          reason: ResultDesc,
          distributorName: payment.order.distributor.user.fullName,
        },
      });

      console.log(`Payment failed for order ${payment.order.orderNumber}: ${ResultDesc}`);
    }

    // Always return success to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  } catch (error: any) {
    console.error('Callback processing error:', error);

    // Still return success to M-Pesa to avoid retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  }
}
```

**Important:**
- Always return 200 OK to M-Pesa (even on error)
- Log all errors for debugging
- Handle missing metadata gracefully
- ResultCode 0 = success, anything else = failure

**Common ResultCodes:**
- `0`: Success
- `1`: Insufficient funds
- `1032`: Request cancelled by user
- `1037`: Timeout
- `2001`: Invalid PIN

---

### 5. Query Transaction Status (Fallback)

If callback is delayed or not received, use query API.

`src/app/api/mpesa/query/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getMpesaAccessToken } from '@/lib/mpesa/auth';
import { mpesaConfig } from '@/lib/mpesa/config';
import { z } from 'zod';

const querySchema = z.object({
  checkoutRequestId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutRequestId } = querySchema.parse(body);

    // Get access token
    const accessToken = await getMpesaAccessToken();

    // Generate timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14);

    // Generate password
    const password = Buffer.from(
      `${mpesaConfig.businessShortCode}${mpesaConfig.passkey}${timestamp}`
    ).toString('base64');

    // Query request
    const queryPayload = {
      BusinessShortCode: mpesaConfig.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await axios.post(
      `${mpesaConfig.baseUrl}/mpesa/stkpushquery/v1/query`,
      queryPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Query error:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
```

**Use Case:**
- User says "I paid but status not updated"
- Callback was delayed or failed
- Poll this endpoint every 5 seconds for 1 minute

---

### 6. Frontend Integration

`src/components/checkout/MpesaPayment.tsx`:

```typescript
'use client';

import { useState } from 'react';
import axios from 'axios';

interface MpesaPaymentProps {
  orderId: string;
  amount: number;
}

export default function MpesaPayment({ orderId, amount }: MpesaPaymentProps) {
  const [phoneNumber, setPhoneNumber] = useState('254');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');

  const initiatePay = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/mpesa/stk-push', {
        orderId,
        phoneNumber,
        amount,
      });

      if (response.data.success) {
        setCheckoutRequestId(response.data.CheckoutRequestID);
        alert(response.data.CustomerMessage);

        // Poll for payment status
        pollPaymentStatus(response.data.CheckoutRequestID);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (checkoutId: string) => {
    const maxAttempts = 12; // 1 minute (12 × 5 seconds)
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        // Check payment status in database
        const response = await axios.get(`/api/payments/status/${orderId}`);

        if (response.data.status === 'PAID') {
          clearInterval(interval);
          alert('Payment successful! Order confirmed.');
          window.location.href = `/distributor/orders/${orderId}`;
        } else if (response.data.status === 'FAILED') {
          clearInterval(interval);
          alert('Payment failed. Please try again.');
        }
      } catch (err) {
        console.error('Status check error:', err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        // Fallback: query M-Pesa directly
        queryMpesaStatus(checkoutId);
      }
    }, 5000); // Every 5 seconds
  };

  const queryMpesaStatus = async (checkoutId: string) => {
    try {
      await axios.post('/api/mpesa/query', {
        checkoutRequestId: checkoutId,
      });
      alert('Payment status checked. Please refresh the page.');
    } catch (err) {
      console.error('Query error:', err);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pay with M-Pesa</h3>

      <div>
        <label className="block text-sm font-medium mb-1">
          M-Pesa Phone Number
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="254712345678"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: 254XXXXXXXXX (no spaces)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={initiatePay}
        disabled={loading || phoneNumber.length !== 12}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Initiating Payment...' : `Pay KES ${amount.toLocaleString()}`}
      </button>

      {checkoutRequestId && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
          ✓ Payment prompt sent to your phone. Enter M-Pesa PIN to complete.
        </div>
      )}
    </div>
  );
}
```

---

## Testing

### Local Testing with ngrok

**Problem:** M-Pesa callback needs a public URL. `localhost` won't work.

**Solution:** Use ngrok to create a tunnel.

**Steps:**

1. **Install ngrok:**
```bash
# macOS (Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

2. **Start your dev server:**
```bash
npm run dev
```

3. **Create tunnel:**
```bash
ngrok http 3000
```

4. **Copy HTTPS URL:**
```
Forwarding: https://abc123.ngrok.io → http://localhost:3000
```

5. **Update `.env.local`:**
```bash
MPESA_CALLBACK_URL=https://abc123.ngrok.io/api/mpesa/callback
```

6. **Test STK Push:**
- Use your Safaricom number
- Enter M-Pesa PIN on phone
- Check callback logs in terminal

**Tip:** ngrok URLs change every restart. For persistent URL, use ngrok paid plan or deploy to Vercel preview.

---

### Sandbox Testing

**Test Credentials:**
- Business ShortCode: `174379`
- Test Phone: Your Safaricom number (`254XXXXXXXXX`)
- Amount: Any amount (e.g., 1, 10, 100)

**Test Scenarios:**

1. **Successful Payment:**
   - Enter valid phone number
   - Enter M-Pesa PIN
   - Check callback received
   - Verify payment status updated

2. **Cancelled Payment:**
   - Enter phone number
   - Cancel prompt on phone
   - Check ResultCode = 1032
   - Verify payment status = FAILED

3. **Timeout:**
   - Enter phone number
   - Don't respond to prompt (wait 60 seconds)
   - Check ResultCode = 1037
   - Verify payment status = FAILED

4. **Insufficient Funds:**
   - Not testable in sandbox (always simulates success)
   - Test in production with small amount

---

## Production Deployment

### Get Production Credentials

1. **Go Live Request:**
   - Login to Daraja portal
   - Submit "Go Live" request
   - Provide:
     - Business registration docs
     - KRA PIN certificate
     - Till/Paybill number
   - Wait for approval (1-2 weeks)

2. **Production Credentials:**
   - Consumer Key (different from sandbox)
   - Consumer Secret (different from sandbox)
   - Business ShortCode (your Till/Paybill number)
   - Passkey (provided by Safaricom)

3. **Update Environment Variables (Vercel):**
```bash
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=prod_key
MPESA_CONSUMER_SECRET=prod_secret
MPESA_BUSINESS_SHORT_CODE=your_paybill
MPESA_PASSKEY=prod_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

4. **Test with Small Amount:**
   - Use real phone number
   - Pay KES 1 or 10
   - Verify end-to-end flow
   - Check real M-Pesa receipt

---

## Security Best Practices

### 1. Validate Callback Source

Add IP whitelisting in callback route:

```typescript
const MPESA_IPS = [
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.138',
  '196.201.212.129',
  '196.201.212.136',
  '196.201.212.74',
  '196.201.212.69',
];

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || '';

  if (!MPESA_IPS.includes(clientIp)) {
    console.warn('Callback from unauthorized IP:', clientIp);
    // Still process but log for monitoring
  }

  // ... rest of callback logic
}
```

### 2. Idempotency

Prevent duplicate processing:

```typescript
// In callback handler
const existingPayment = await prisma.payment.findFirst({
  where: {
    mpesaReceiptNumber: mpesaReceiptNumber,
  },
});

if (existingPayment) {
  console.log('Payment already processed:', mpesaReceiptNumber);
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
```

### 3. Encrypt Credentials

Use environment variables, never hardcode:

```typescript
// Bad ❌
const consumerKey = 'ABC123...';

// Good ✅
const consumerKey = process.env.MPESA_CONSUMER_KEY!;
```

### 4. Log All Transactions

```typescript
// Create audit log
await prisma.mpesaLog.create({
  data: {
    checkoutRequestId: CheckoutRequestID,
    merchantRequestId: MerchantRequestID,
    resultCode: ResultCode,
    resultDesc: ResultDesc,
    amount: amount,
    phoneNumber: phoneNumber,
    mpesaReceiptNumber: mpesaReceiptNumber,
    rawCallback: JSON.stringify(body),
    createdAt: new Date(),
  },
});
```

---

## Error Handling

### Common Errors & Solutions

**1. "Invalid Access Token"**
- Cause: Token expired or wrong credentials
- Solution: Check consumer key/secret, regenerate token

**2. "Bad Request - Invalid ShortCode"**
- Cause: Wrong business shortcode
- Solution: Verify shortcode matches environment (sandbox vs production)

**3. "Bad Request - Invalid Amount"**
- Cause: Amount not integer or too large
- Solution: Use `Math.floor(amount)`, max 150,000

**4. "The initiator information is invalid"**
- Cause: Wrong passkey
- Solution: Copy passkey from Daraja test credentials page

**5. "Callback not received"**
- Cause: Callback URL not accessible
- Solution: Check ngrok tunnel, verify URL is public HTTPS

**6. "Request cancelled by user"**
- ResultCode: 1032
- Solution: User cancelled, allow retry

**7. "Timeout"**
- ResultCode: 1037
- Solution: User didn't respond, allow retry

---

## Monitoring & Logging

### What to Log

**Every STK Push:**
```typescript
console.log('STK Push initiated:', {
  orderId,
  orderNumber,
  amount,
  phoneNumber,
  checkoutRequestId,
  timestamp: new Date(),
});
```

**Every Callback:**
```typescript
console.log('Callback received:', {
  checkoutRequestId,
  resultCode,
  resultDesc,
  mpesaReceiptNumber,
  amount,
  timestamp: new Date(),
});
```

**Failures:**
```typescript
console.error('Payment failed:', {
  orderId,
  resultCode,
  resultDesc,
  reason: 'User cancelled',
  timestamp: new Date(),
});
```

### Monitoring Metrics

- **Payment Success Rate:** Target > 95%
- **Average Processing Time:** Target < 30 seconds
- **Callback Delay:** Target < 10 seconds
- **Error Rate:** Target < 5%

### Alerts

Set up alerts for:
- Payment success rate drops below 90%
- Callback not received within 60 seconds
- Multiple failures for same order
- API errors (4xx, 5xx responses)

---

## Troubleshooting Checklist

**Payment not initiating:**
- [ ] Valid access token generated
- [ ] Correct environment (sandbox/production)
- [ ] Phone number format correct (254XXXXXXXXX)
- [ ] Amount is integer
- [ ] Credentials match environment

**Callback not received:**
- [ ] Callback URL is public HTTPS
- [ ] ngrok tunnel active (for local)
- [ ] Callback route returns 200 OK
- [ ] Check M-Pesa Daraja portal logs
- [ ] Try query API as fallback

**Payment stuck in PENDING:**
- [ ] Check callback logs
- [ ] Query transaction status
- [ ] Check order payment status in database
- [ ] Verify M-Pesa receipt on phone

**Production not working (sandbox works):**
- [ ] Go Live request approved
- [ ] Production credentials updated
- [ ] Environment variable set to "production"
- [ ] Callback URL matches production domain
- [ ] Test with small amount first

---

## Resources

**Official Documentation:**
- Daraja Portal: https://developer.safaricom.co.ke
- API Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
- Go Live Process: https://developer.safaricom.co.ke/GoLive

**Support:**
- Email: apisupport@safaricom.co.ke
- Phone: +254 711 082 300

**Testing:**
- Sandbox Base URL: https://sandbox.safaricom.co.ke
- Production Base URL: https://api.safaricom.co.ke
- Test Shortcode: 174379

---

## Summary

**Key Points:**
1. M-Pesa only for warehouse → distributor payments
2. STK Push sends prompt to customer's phone
3. Callback updates payment status automatically
4. Always validate inputs and handle errors
5. Use ngrok for local testing
6. Log all transactions for debugging
7. Get production credentials before go-live

**Next Steps:**
1. Set up Daraja account
2. Get sandbox credentials
3. Implement STK Push route
4. Implement callback route
5. Test with ngrok
6. Deploy to Vercel
7. Request Go Live
8. Test production with small amount
9. Monitor success rate

---

**Version:** 1.0
**Last Updated:** November 18, 2025
**Status:** Ready for Implementation

**See Also:**
- API Reference: `.claude/api-reference.md`
- Implementation Guide: `.claude/implementation-guide.md`
- Main TRD: `/TRD.md` (Section 6)
