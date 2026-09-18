# Subscription & Payment Flow Documentation

## Overview

Billing covers two product types, both stored in `subscription_plans` and distinguished by **`paymentType`**:

| `paymentType` | Meaning | Paystack | Entitlement |
|---|---|---|---|
| `subscription` | Recurring monthly plan | Paystack Plan + Subscription | Active row in `subscriptions` + incident limits per period |
| `one_time` | Pay as you go | One-time charge only (no Paystack plan) | Row(s) in `incident_credits` |

Account types: **`individual`** | **`organization`**.

Base URL: `{API}/api/v1`  
Related UI docs: [`PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md`](./PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md), [`ADMIN_SUBSCRIPTION_PLANS.md`](./ADMIN_SUBSCRIPTION_PLANS.md), [`FRONTEND_TICKETS_UI.md`](./FRONTEND_TICKETS_UI.md)

---

## Table of Contents

1. [Paystack Setup](#1-paystack-setup)
2. [Database Architecture](#2-database-architecture)
3. [Payment Flows](#3-payment-flows)
4. [API Endpoints](#4-api-endpoints)
5. [Webhook Events](#5-webhook-events)
6. [Testing Guide](#6-testing-guide)
7. [File Structure](#7-file-structure)
8. [Security](#8-security)
9. [Environment Variables](#9-environment-variables)

---

## 1. Paystack Setup

### Step 1: Account & keys

1. Go to [dashboard.paystack.com](https://dashboard.paystack.com)
2. **Settings → API Keys & Webhooks**
3. Copy:
   - Test/Live **Secret Key** (`sk_test_` / `sk_live_`)
   - Test/Live **Public Key** (`pk_test_` / `pk_live_`)

### Step 2: Plans — how they are created now

**Preferred:** create plans via **admin API** (backend creates the Paystack plan for subscriptions).

```
POST /api/v1/admin/subscription-plans
Authorization: Bearer {staff_jwt}
```

- `paymentType: "subscription"` → backend creates a Paystack plan and stores `paystackPlanCode`
- `paymentType: "one_time"` → **no** Paystack plan; `paystackPlanCode` stays `null`

You can still create subscription plans manually in Paystack and paste `paystackPlanCode`, but admin auto-create is the normal path.

### Step 3: Webhooks

1. **Settings → Webhooks → Add Webhook URL**
2. URL:

```
https://your-domain.com/api/v1/webhooks/paystack
```

3. Listen for at least:

- `subscription.create`
- `subscription.disable`
- `subscription.enable`
- `invoice.create`
- `invoice.payment_failed`
- `charge.success`
- `charge.failed`

### Step 4: Environment

```env
PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_test_public_key
# Optional extra layer for production
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
```

Signature verification uses the Paystack secret key on the `x-paystack-signature` header.

---

## 2. Database Architecture

### Entity: `subscription_plans`

Catalog for **both** recurring and one-time products.

```typescript
{
  id: UUID;
  name: string;
  tier: number; // ranking / display order (0 allowed for PAYG)
  accountType: "individual" | "organization";
  paymentType: "subscription" | "one_time";
  amount: number; // kobo
  currency: "NGN";
  interval: string | null; // e.g. "monthly" for subscriptions; null for one_time
  paystackPlanCode: string | null; // required path for subscriptions; null for one_time
  description: string;
  features: string[];
  maxIncidents: number | null; // null = unlimited (subscriptions); one_time usually 1
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Entity: `subscriptions`

Recurring entitlements only (`paymentType = subscription`).

```typescript
{
  id: UUID;
  accountId: UUID;
  planId: UUID;
  paystackCustomerCode: string | null;
  paystackSubscriptionCode: string | null;
  paystackEmailToken: string | null;
  status: "active" | "expired" | "cancelled" | "past_due";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  metadata: JSON | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Status**

| Status | Meaning |
|---|---|
| `active` | Paid and in good standing |
| `past_due` | Payment failed / retry pending; grace period |
| `expired` | Period ended, no longer active |
| `cancelled` | User cancelled; access until period end if `cancelAtPeriodEnd` |

### Entity: `subscription_transactions`

Payment records for subscription renewals **and** PAYG one-time charges.

```typescript
{
  id: UUID;
  accountId: UUID;
  subscriptionId: UUID | null; // null for PAYG
  planId: UUID | null;
  transactionReference: string;
  status: "success" | "failed" | "pending";
  amount: number; // kobo
  currency: string;
  paymentMethod: string;
  paystackCustomerCode: string | null;
  metadata: JSON | null; // e.g. { type: "payg", paymentType: "one_time" }
}
```

### Entity: `incident_credits`

PAYG entitlement. Created on successful one-time payment; consumed when a ticket is created for that account.

```typescript
{
  id: UUID;
  accountId: UUID;
  planId: UUID | null;
  transactionId: UUID | null;
  incidentsGranted: number; // usually 1
  incidentsUsed: number;
  status: "available" | "used" | "expired";
  ticketId: string | null;
  metadata: JSON | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Entity: `paystack_events`

Webhook audit log (idempotency / debugging).

---

## 3. Payment Flows

### 3.1 Recurring subscription

```
Frontend → POST /api/v1/subscriptions/initialize
  { planId, callbackUrl }
  Auth: account JWT (AccountsAuthGuard)

Backend checks:
  - plan.paymentType === "subscription"
  - plan has paystackPlanCode
  - account has no active subscription

Backend → Paystack transaction/initialize
  { email, amount, plan: PLN_xxx, metadata: { type: "subscription", accountId, planId } }

Frontend redirects to authorizationUrl
User pays
Paystack webhooks:
  - charge.success → extend/activate subscription period + transaction row
  - subscription.create → attach subscription_code / email_token
```

Ticket eligibility from subscription: count tickets for the account in `currentPeriodStart`…`currentPeriodEnd` vs `plan.maxIncidents`.

### 3.2 Pay as you go (one-time)

```
Frontend → POST /api/v1/subscriptions/initialize-payg
  { planId, callbackUrl }
  Auth: account JWT

Backend checks:
  - plan.paymentType === "one_time"
  - plan.active

Backend → Paystack transaction/initialize
  NO plan code
  metadata: { type: "payg", paymentType: "one_time", accountId, planId, incidentsGranted }

Creates pending subscription_transactions row

On charge.success (metadata.type === "payg"):
  - mark transaction success
  - create incident_credits (status: available)
  - does NOT create a subscriptions row
```

Ticket create consumes one available credit.

### 3.3 Monthly renewal (subscriptions only)

```
Paystack charges saved card
→ charge.success / invoice events
→ backend updates period dates, status active
→ on failure → past_due + notify
```

---

## 4. API Endpoints

All paths below are under **`/api/v1`**.

### Public

#### Get plans (active only)

```
GET /subscriptions/plans
GET /subscriptions/plans?accountType=individual
GET /subscriptions/plans?accountType=organization
GET /subscriptions/plans?paymentType=subscription
GET /subscriptions/plans?paymentType=one_time
GET /subscriptions/plans?accountType=individual&paymentType=one_time
```

| Query | Values |
|---|---|
| `accountType` | `individual` \| `organization` |
| `paymentType` | `subscription` \| `one_time` |

Response: **array** of plans (not wrapped). Includes `paymentType`. Does **not** include `paystackPlanCode`.

### Account-protected (`AccountsAuthGuard` — portal account JWT)

#### Initialize subscription

```
POST /subscriptions/initialize
Authorization: Bearer {account_jwt}

{
  "planId": "uuid",
  "callbackUrl": "https://your-app.com/subscription/success"
}
```

```json
{
  "authorizationUrl": "https://paystack.com/pay/xxxxx",
  "reference": "xxxxx",
  "accessCode": "xxxxx"
}
```

Rejects `one_time` plans (use `initialize-payg`).

#### Initialize pay-as-you-go

```
POST /subscriptions/initialize-payg
Authorization: Bearer {account_jwt}

{
  "planId": "uuid",
  "callbackUrl": "https://your-app.com/payg/success"
}
```

Same response shape as initialize. Rejects `subscription` plans.

#### Subscription status

```
GET /subscriptions/status
Authorization: Bearer {account_jwt}
```

Returns subscription **and** PAYG in one payload so the UI can show `paymentType`:

```json
{
  "subscription": {
    "id": "uuid",
    "status": "active",
    "cancelAtPeriodEnd": false,
    "plan": {
      "id": "uuid",
      "name": "Basic Shield",
      "tier": 1,
      "accountType": "individual",
      "paymentType": "subscription",
      "interval": "monthly",
      "amount": 5000000,
      "currency": "NGN",
      "features": [],
      "maxIncidents": 1
    },
    "usage": {
      "usedIncidents": 0,
      "remainingIncidents": 1,
      "maxIncidents": 1
    },
    "currentPeriodStart": "...",
    "currentPeriodEnd": "...",
    "nextBillingDate": "..."
  },
  "payg": {
    "paymentType": "one_time",
    "creditsAvailable": 0
  },
  "entitlement": {
    "hasAccess": true,
    "sources": ["subscription"]
  }
}
```

If there is no recurring plan but PAYG credits exist, `subscription` is `null` and `payg.creditsAvailable` / `entitlement.sources` still reflect access.

#### Cancel / resume

```
POST /subscriptions/cancel
POST /subscriptions/resume
Authorization: Bearer {account_jwt}
```

Cancel sets `cancelAtPeriodEnd: true` (access until period end). Resume clears that flag.

#### Transactions history

```
GET /subscriptions/transactions
Authorization: Bearer {account_jwt}
```

(Paginated account payment history.)

### Admin (staff JWT — `SUPER_ADMIN` / `ADMIN`)

Plan CRUD lives under admin. Full guide: [`ADMIN_SUBSCRIPTION_PLANS.md`](./ADMIN_SUBSCRIPTION_PLANS.md).

```
GET    /admin/subscription-plans
GET    /admin/subscription-plans?paymentType=subscription
GET    /admin/subscription-plans?paymentType=one_time
GET    /admin/subscription-plans?accountType=individual&paymentType=one_time
POST   /admin/subscription-plans
PATCH  /admin/subscription-plans/:id
DELETE /admin/subscription-plans/:id
```

Create body (subscription):

```json
{
  "name": "Basic Shield",
  "tier": 1,
  "accountType": "individual",
  "paymentType": "subscription",
  "amount": 5000000,
  "currency": "NGN",
  "interval": "monthly",
  "description": "...",
  "features": ["..."],
  "maxIncidents": 1,
  "active": true
}
```

Create body (one-time) — **omit `interval`**:

```json
{
  "name": "Pay As You Go",
  "tier": 0,
  "accountType": "individual",
  "paymentType": "one_time",
  "amount": 2500000,
  "currency": "NGN",
  "description": "...",
  "features": ["..."],
  "maxIncidents": 1,
  "active": true
}
```

Amounts are **kobo** (`5000000` = ₦50,000).

### Webhook (no user auth)

```
POST /webhooks/paystack
Headers: x-paystack-signature: {signature}
```

---

## 5. Webhook Events

| Event | Action |
|---|---|
| `subscription.create` | Attach Paystack subscription codes; link pending transactions |
| `subscription.enable` | Set status `active` |
| `subscription.disable` | Set `expired` / end access path |
| `invoice.create` | Log / prep renewal |
| `charge.success` | If metadata `type=payg` → grant `incident_credits`. Else → renew/activate subscription + transaction |
| `invoice.payment_failed` / `charge.failed` | Mark `past_due`, notify account |

**PAYG branch:** `charge.success` with `metadata.type === "payg"` (or `paymentType: one_time`) must **not** create a recurring `subscriptions` row.

---

## 6. Testing Guide

### Cards (Paystack test mode)

- Success: `4084084084084081`
- Failure: `5085085085085080` (confirm current Paystack docs)
- CVV: any 3 digits; expiry: any future date

### Flows to test

1. Admin creates `subscription` plan → public list with `?paymentType=subscription`
2. Admin creates `one_time` plan → list with `?paymentType=one_time`
3. Account `POST /subscriptions/initialize` → pay → status active
4. Account `POST /subscriptions/initialize-payg` → pay → `incident_credits` available
5. Staff creates ticket with `accountId` → eligibility uses sub remaining incidents **or** PAYG credit
6. Cancel / resume subscription
7. Local webhooks via ngrok → `https://xxxx.ngrok.io/api/v1/webhooks/paystack`

---

## 7. File Structure

```
src/modules/subscriptions/
├── entities/
│   ├── subscription-plan.entity.ts
│   ├── subscription.entity.ts
│   ├── transaction.entity.ts
│   ├── incident-credit.entity.ts
│   └── paystack-event.entity.ts
├── enums/
│   └── plan-payment-type.enum.ts   # subscription | one_time
├── dto/
│   ├── initialize-subscription.dto.ts
│   └── cancel-subscription.dto.ts
├── services/
│   ├── subscriptions.service.ts
│   ├── paystack.service.ts
│   └── paystack-webhook.service.ts
├── controllers/
│   ├── subscriptions.controller.ts
│   └── webhooks.controller.ts
└── repository/
    ├── subscriptions.repository.ts
    ├── transactions.repository.ts
    └── incident-credits.repository.ts
```

Admin plan create/update: `src/modules/admin/admin.service.ts` + `dto/subscription-plan.dto.ts`

---

## 8. Security

1. Verify Paystack webhook signatures
2. Never expose secret key to the frontend
3. Idempotent webhook handling (`paystack_events` / transaction reference)
4. Do not store card details
5. Use account JWT for customer payment routes; staff JWT for admin plan CRUD

---

## 9. Environment Variables

```env
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_WEBHOOK_SECRET=xxxxx
```

Frontend callback URLs are supplied per request as `callbackUrl` on initialize / initialize-payg.

---

## Quick Start Checklist

- [ ] Paystack account + test keys
- [ ] Webhook → `/api/v1/webhooks/paystack`
- [ ] Env vars set
- [ ] Admin creates subscription plans (`paymentType: subscription`)
- [ ] Admin creates PAYG products (`paymentType: one_time`)
- [ ] Test public filters: `accountType` + `paymentType`
- [ ] Test `initialize` and `initialize-payg` with test cards
- [ ] Confirm ticket eligibility (sub limit vs PAYG credit)
- [ ] Switch to live keys for production

---

## Related docs

- [`PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md`](./PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md) — public pricing + account billing APIs (FE handoff)
- [`ADMIN_SUBSCRIPTION_PLANS.md`](./ADMIN_SUBSCRIPTION_PLANS.md) — admin UI + create/update payloads
- [`FRONTEND_TICKETS_UI.md`](./FRONTEND_TICKETS_UI.md) — tickets, `createdFor`, eligibility, PAYG credits
