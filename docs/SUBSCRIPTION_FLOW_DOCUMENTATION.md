# 🔐 Subscription & Payment Flow Documentation

## Overview

Implementation of recurring subscriptions using Paystack, supporting both Individual and Organization plans with automatic monthly billing.

---

## 📋 Table of Contents

1. [Paystack Setup](#paystack-setup)
2. [Database Architecture](#database-architecture)
3. [Subscription Flow](#subscription-flow)
4. [API Endpoints](#api-endpoints)
5. [Webhook Events](#webhook-events)
6. [Testing Guide](#testing-guide)

---

## 1. Paystack Setup

### Step 1: Create Paystack Account

1. Go to [dashboard.paystack.com](https://dashboard.paystack.com)
2. Sign up/Login
3. Complete business verification

### Step 2: Get API Keys

1. Navigate to **Settings** → **API Keys & Webhooks**
2. Get your:
   - **Test Secret Key** (starts with `sk_test_`)
   - **Live Secret Key** (starts with `sk_live_`)
   - **Public Key** (starts with `pk_test_` or `pk_live_`)

### Step 3: Create Subscription Plans in Paystack Dashboard

For **each** subscription tier, create a plan:

#### For Individuals

1. **Tier 1: Essential Protection** - ₦15,000/month
2. **Tier 2: Advanced Security** - ₦30,000/month
3. **Tier 3: Premium Defense** - ₦50,000/month

#### For Organizations

1. **Tier 1: Business Shield** - ₦80,000/month
2. **Tier 2: Enterprise Guard** - ₦250,000/month
3. **Tier 3: Corporate Fortress** - ₦500,000/month

**How to create in Paystack:**

1. Go to **Settings** → **Subscriptions & Plans** → **Create Plan**
2. Enter:
   - **Name**: e.g., "Essential Protection"
   - **Amount**: 1500000 (kobo) = ₦15,000
   - **Interval**: "Monthly"
   - **Currency**: NGN
   - **Send Email Invoice**: Yes
3. Click **Create**
4. Copy the **Plan Code** (e.g., `PLN_xxxxxxxxx`)

**Note:** Create **6 plans in total** (3 for individuals, 3 for organizations)

### Step 4: Configure Webhooks

1. Go to **Settings** → **Webhooks**
2. Click **Add Webhook URL**
3. Enter: `https://your-domain.com/api/subscriptions/webhook`
4. Select events to listen to:
   - ✅ `subscription.create`
   - ✅ `subscription.disable`
   - ✅ `subscription.enable`
   - ✅ `invoice.create`
   - ✅ `invoice.payment_failed`
   - ✅ `charge.success`
   - ✅ `charge.failed`
5. Save

### Step 5: Environment Variables

Add to your `.env`:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_test_public_key

# For Production (later)
# PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key
# PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key

# Webhook Secret (for verifying webhook authenticity)
# This is optional but recommended for production
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
```

**Note on Webhook Secret**: For local testing, you can skip this. Paystack sends webhooks with a signature in the `x-paystack-signature` header that you can verify using your secret key. The webhook secret is an additional security layer you can set up later for production.

---

## 2. Database Architecture

### Entity 1: `subscription_plans`

Stores all available subscription plans (6 total).

```typescript
{
  id: UUID;
  name: string; // "Essential Protection"
  tier: number; // 1, 2, 3
  accountType: "individual" | "organization";
  amount: number; // 1500000 (kobo)
  currency: "NGN";
  interval: "monthly";
  paystackPlanCode: string; // "PLN_xxxxxxxxx"
  description: string;
  features: JSON; // Array of features
  maxIncidents: number | null; // How many incidents per month allowed (null = unlimited)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Entity 2: `subscriptions`

Tracks user subscriptions and renewal status.

```typescript
{
  id: UUID;
  accountId: UUID; // FK to accounts
  planId: UUID; // FK to subscription_plans
  paystackCustomerCode: string; // Customer code from Paystack
  paystackSubscriptionCode: string; // Subscription code from Paystack
  status: "active" | "expired" | "cancelled" | "past_due";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  metadata: JSON; // Additional info
  createdAt: Date;
  updatedAt: Date;
}
```

**Subscription Status Explanation:**

- **`active`**: Subscription is paid and active, user has full access
- **`past_due`**: Payment failed/retry pending. User still has access during grace period, but renewal is in jeopardy
- **`expired`**: Subscription period ended and no longer active (after grace period)
- **`cancelled`**: User cancelled subscription, will expire at period end

**Why `past_due` exists:**
Payment failures occur for reasons like insufficient funds or expired cards. `past_due` provides a grace period where:

- User retains access
- Paystack attempts to retry the payment
- Organization can notify the user to update payment details
- If fixed, status becomes `active`; otherwise it becomes `expired`

### Entity 3: `paystack_events` (Optional but Recommended)

Log all webhook events for debugging.

```typescript
{
  id: UUID;
  eventType: string; // "subscription.create"
  reference: string;
  paystackEventId: string;
  data: JSON; // Full event payload
  processed: boolean;
  processedAt: Date | null;
  createdAt: Date;
}
```

---

## 3. Subscription Flow

### 3.1 User Initiates Subscription

```
Frontend → Backend
POST /api/subscriptions/initialize
{
  "planId": "uuid",
  "callbackUrl": "https://your-app.com/subscription/success"
}

Backend → Paystack
POST https://api.paystack.co/transaction/initialize
{
  "email": user.email,
  "amount": 1500000,
  "plan": "PLN_xxxxxxxxx",
  "callback_url": "callbackUrl",
  "metadata": {
    "accountId": user.id,
    "planId": "uuid"
  }
}

Paystack → Backend
Returns: {
  "authorization_url": "https://paystack.com/pay/xxxxx",
  "access_code": "xxxxx",
  "reference": "xxxxx"
}

Backend → Frontend
Returns authorization_url for redirect
```

### 3.2 Payment Verification

```
User completes payment on Paystack
↓
Paystack redirects to callbackUrl with reference
↓
Frontend: GET /api/subscriptions/verify?reference=xxxxx
↓
Backend verifies with Paystack:
GET https://api.paystack.co/transaction/verify/:reference
↓
If successful:
- Create customer in Paystack (if not exists)
- Create subscription in Paystack
- Store subscription in database
- Update account record
```

### 3.3 Webhook Events

```
Paystack → Backend
POST /api/subscriptions/webhook
{
  "event": "subscription.create|disable|enable|invoice.create|etc",
  "data": {...}
}

Backend:
1. Verify webhook signature
2. Log event to paystack_events table
3. Update subscription status
4. Handle lifecycle events
```

### 3.4 Monthly Renewal (Automatic)

```
Every Month:
1. Paystack charges user's saved card
2. Sends webhook: invoice.create → charge.success
3. Backend updates subscription dates
4. If payment fails → sends webhook: invoice.payment_failed
5. Backend marks subscription as past_due
```

---

## 4. API Endpoints

### Public Endpoints

#### 1. Get Available Plans

```
GET /api/subscriptions/plans

Query Params:
- accountType (optional): 'individual' | 'organization'

Response:
{
  "data": [
    {
      "id": "uuid",
      "name": "Essential Protection",
      "tier": 1,
      "amount": 1500000,
      "currency": "NGN",
      "description": "...",
      "features": [...],
      "maxIncidents": 1 // or null for unlimited
    },
    ...
  ]
}
```

```

---

### Protected Endpoints (Require Auth)

#### 2. Initialize Subscription

```

POST /api/subscriptions/initialize

Headers:

- Authorization: Bearer {token}

Body:
{
"planId": "uuid",
"callbackUrl": "<https://your-app.com/subscription/success>"
}

Response:
{
"authorizationUrl": "<https://paystack.com/pay/xxxxx>",
"reference": "xxxxx",
"accessCode": "xxxxx"
}

```

#### 3. Verify Payment

```

GET /api/subscriptions/verify?reference=xxxxx

Headers:

- Authorization: Bearer {token}

Response (Success):
{
"status": "active",
"subscription": {
"id": "uuid",
"plan": {
"name": "Essential Protection",
"tier": 1
},
"startDate": "2025-01-01",
"endDate": "2025-02-01",
"nextBillingDate": "2025-02-01"
}
}

Response (Failure):
{
"message": "Payment verification failed"
}

```

#### 4. Get Current Subscription Status

```

GET /api/subscriptions/status

Headers:

- Authorization: Bearer {token}

Response:
{
"subscription": {
"id": "uuid",
"status": "active",
"plan": {
"name": "Essential Protection",
"tier": 1,
"features": [...]
},
"currentPeriodStart": "2025-01-01T00:00:00Z",
"currentPeriodEnd": "2025-02-01T00:00:00Z",
"nextBillingDate": "2025-02-01T00:00:00Z"
}
}

OR if no subscription:
{
"subscription": null,
"message": "No active subscription"
}

```

#### 5. Cancel Subscription

```

POST /api/subscriptions/cancel

Headers:

- Authorization: Bearer {token}

Response:
{
"message": "Subscription will be cancelled at period end",
"subscription": {
"status": "active",
"cancelledAt": null,
"cancelAtPeriodEnd": true
}
}

```

#### 6. Resume Cancelled Subscription

```

POST /api/subscriptions/resume

Headers:

- Authorization: Bearer {token}

Response:
{
"message": "Subscription resumed successfully",
"subscription": {
"cancelAtPeriodEnd": false
}
}

```

---

### Webhook Endpoint (No Auth)

#### 7. Paystack Webhooks

```

POST /api/subscriptions/webhook

Headers:

- x-paystack-signature: {signature from Paystack}

Body:
{
"event": "subscription.create|disable|enable|invoice.create|etc",
"data": {...}
}

Response:
200 OK

```

---

## 5. Webhook Events

### Event Types & Actions

#### 5.1 `subscription.create`

- **Triggered**: When subscription is successfully created
- **Action**: Mark subscription as `active`, set period dates

#### 5.2 `subscription.enable`

- **Triggered**: When a disabled subscription is re-enabled
- **Action**: Update status to `active`

#### 5.3 `subscription.disable`

- **Triggered**: When subscription is disabled (payment failure)
- **Action**: Update status to `past_due` or `expired`

#### 5.4 `invoice.create`

- **Triggered**: Monthly before billing
- **Action**: Log invoice creation

#### 5.5 `charge.success`

- **Triggered**: Successful monthly payment
- **Action**: Update subscription dates, extend period

#### 5.6 `invoice.payment_failed`

- **Triggered**: Failed payment
- **Action**: Update status to `past_due`, notify user

#### 5.7 `charge.failed`

- **Triggered**: Charge attempt failed
- **Action**: Update status accordingly

---

## 6. Testing Guide

### Test Mode Setup

1. Use Paystack **Test Mode** keys in development
2. Use test card numbers:
   - **Success**: `4084084084084081`
   - **Failure**: `5084084084084085`
3. CVV: Any 3 digits (e.g., `408`)
4. Expiry: Any future date

### Test Flow

1. **Create Test Plans in Paystack Dashboard**
   - Go to test mode
   - Create 6 plans with test prices (e.g., ₦100, ₦200, etc.)

2. **Test Subscription Creation**

```

POST /api/subscriptions/initialize
Use test card: 4084084084084081

```

3. **Test Webhook Locally**

**Option A: Using ngrok (Recommended for local testing)**

```

1. Install ngrok: <https://ngrok.com/download>
2. Start your local server: npm run start:dev (port 3000)
3. In another terminal, run: ngrok http 3000
4. Copy the ngrok URL (e.g., <https://abc123.ngrok.io>)
5. Go to Paystack Dashboard → Settings → Webhooks
6. Add webhook URL: <https://abc123.ngrok.io/api/subscriptions/webhook>
7. Now test by creating a subscription

```

**Option B: Using Paystack Webhook Simulator**
- Use [Paystack Webhook Simulator](https://paystack.com/docs/payments/test-payments)
- Send test events to your local endpoint
- Note: This requires manually triggering events

**Option C: Test Production Webhook Locally**
- Use [webhook.site](https://webhook.site) to capture webhook events
- Copy the unique URL and add to Paystack
- Manually process the captured events in your backend

4. **Test Lifecycle**
- Create subscription
- Trigger payment success webhook
- Trigger payment failure webhook
- Cancel subscription
- Resume subscription

---

## 7. Implementation File Structure

```

src/modules/subscriptions/
├── entities/
│ ├── subscription-plan.entity.ts
│ ├── subscription.entity.ts
│ └── paystack-event.entity.ts
├── dto/
│ ├── initialize-subscription.dto.ts
│ ├── verify-payment.dto.ts
│ └── cancel-subscription.dto.ts
├── services/
│ ├── subscriptions.service.ts
│ └── paystack.service.ts
├── controllers/
│ └── subscriptions.controller.ts
└── repository/
└── subscriptions.repository.ts

````

---

## 8. Security Considerations

1. **Webhook Verification**
   - Always verify Paystack signature to prevent fake events
2. **API Key Security**
   - Never expose secret key in frontend
   - Store in environment variables only
3. **Idempotency**
   - Handle duplicate webhooks gracefully
   - Check `paystackEventId` before processing

4. **Error Handling**
   - Log all webhook events for debugging
   - Handle edge cases (expired cards, bank issues)
5. **Data Privacy**
   - Don't store card details (Paystack handles this)
   - Only store necessary metadata

---

## 9. Future Enhancements

1. **Trial Periods**
   - Add 7-day free trial for new users
2. **Upgrades/Downgrades**
   - Prorated billing when switching plans
3. **Coupons/Promotions**
   - Discount codes system
4. **Usage Tracking**
   - Track incident usage vs. plan limits
5. **Email Notifications**
   - Send emails on subscription events
6. **Admin Dashboard**
   - View all subscriptions, revenue, etc.

---

## 10. Environment Variables Summary

```env
# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_WEBHOOK_SECRET=xxxxx

# Frontend callback URL
FRONTEND_SUBSCRIPTION_SUCCESS_URL=http://localhost:3000/subscription/success
FRONTEND_SUBSCRIPTION_FAILURE_URL=http://localhost:3000/subscription/failed
````

---

## Quick Start Checklist

- [ ] Create Paystack account
- [ ] Get API keys (test mode)
- [ ] Create 6 subscription plans in Paystack
- [ ] Configure webhook URL
- [ ] Add environment variables
- [ ] Create database entities
- [ ] Implement Paystack service
- [ ] Implement subscription service
- [ ] Create controller endpoints
- [ ] Test with test cards
- [ ] Deploy and switch to live keys
