# Public & Account Subscriptions — Frontend Guide

**One doc** for the customer pricing page and logged-in account billing APIs.

Base URL: `{API}/api/v1`  
Example: `https://your-api.onrender.com/api/v1`

| Who | Auth | Token |
|---|---|---|
| Anyone browsing plans | None | — |
| Logged-in customer (checkout, status, history) | Required | Portal **account** JWT |

Staff / admin plan CRUD → [`ADMIN_SUBSCRIPTION_PLANS.md`](./ADMIN_SUBSCRIPTION_PLANS.md)

---

## Enums

| Enum | Values |
|---|---|
| `accountType` | `individual` \| `organization` |
| `paymentType` | `subscription` \| `one_time` |
| Subscription `status` | `active` \| `expired` \| `cancelled` \| `past_due` |
| Transaction `status` | `success` \| `failed` \| `pending` |

**Amounts are kobo** (`5000000` = ₦50,000).

```ts
const naira = amountInKobo / 100;
const display = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
}).format(naira);
```

---

## Pricing page UI

```
[ Individual | Organization ]          ← accountType
[ Subscriptions | Pay as you go ]      ← paymentType

┌─────────┐ ┌─────────┐ ┌─────────┐
│ Plan    │ │ Plan    │ │ Plan    │
│ ₦xx     │ │ ...     │ │ ...     │
│ features│ │         │ │         │
│ [CTA]   │ │ [CTA]   │ │ [CTA]   │
└─────────┘ └─────────┘ └─────────┘
```

| UI control | Query | Values |
|---|---|---|
| Individual / Organization | `accountType` | `individual` \| `organization` |
| Subscriptions / Pay as you go | `paymentType` | `subscription` \| `one_time` |

Defaults: `accountType=individual` (or logged-in account role), `paymentType=subscription`.

Empty list `[]` → “No plans available for this selection.”

| Card `paymentType` | Button | Endpoint (needs login) |
|---|---|---|
| `subscription` | Subscribe | `POST /subscriptions/initialize` |
| `one_time` | Pay for one incident | `POST /subscriptions/initialize-payg` |

Price labels: subscription → `₦50,000 / month`; one-time → `₦25,000` (or `/ incident`).  
`maxIncidents === null` → **Unlimited**. Hide interval when `null`.

---

# Part A — Public (no login)

## List plans

```http
GET /api/v1/subscriptions/plans
GET /api/v1/subscriptions/plans?accountType=individual
GET /api/v1/subscriptions/plans?accountType=organization
GET /api/v1/subscriptions/plans?paymentType=subscription
GET /api/v1/subscriptions/plans?paymentType=one_time
GET /api/v1/subscriptions/plans?accountType=individual&paymentType=subscription
GET /api/v1/subscriptions/plans?accountType=individual&paymentType=one_time
GET /api/v1/subscriptions/plans?accountType=organization&paymentType=one_time
```

| | |
|---|---|
| Auth | **None** |
| Returns | Active plans only |
| Shape | **Raw array** (not `{ data: [...] }`) |
| Order | `tier` ascending |

### Response (subscription)

```json
[
  {
    "id": "uuid",
    "name": "Basic Shield",
    "tier": 1,
    "accountType": "individual",
    "paymentType": "subscription",
    "amount": 5000000,
    "currency": "NGN",
    "interval": "monthly",
    "description": "For everyday phone & social media users",
    "features": [
      "Incident reporting via phone/email",
      "Social media account recovery"
    ],
    "maxIncidents": 1,
    "active": true,
    "createdAt": "2026-09-17T00:00:00.000Z",
    "updatedAt": "2026-09-17T00:00:00.000Z"
  }
]
```

### Response (one-time)

```json
[
  {
    "id": "uuid",
    "name": "Pay As You Go",
    "tier": 0,
    "accountType": "individual",
    "paymentType": "one_time",
    "amount": 2500000,
    "currency": "NGN",
    "interval": null,
    "description": "One-time incident response — pay only when you need help",
    "features": [
      "Single cyber incident resolution",
      "No monthly commitment"
    ],
    "maxIncidents": 1,
    "active": true,
    "createdAt": "2026-09-18T00:00:00.000Z",
    "updatedAt": "2026-09-18T00:00:00.000Z"
  }
]
```

### Card field map

| Field | UI |
|---|---|
| `id` | Checkout `planId` |
| `name` | Title |
| `paymentType` | Tab + which checkout API |
| `amount` | Format from kobo |
| `interval` | `/month` if `monthly`; hide if `null` |
| `features` | Bullets / chips |
| `maxIncidents` | Number or Unlimited |

Do **not** expect `paystackPlanCode` (not returned).

---

# Part B — Account (logged in)

```http
Authorization: Bearer {account_jwt}
Content-Type: application/json
```

If CTA clicked while logged out → login/register, then return to plans.

---

## B1. Billing status ⚠️ UPDATED

```http
GET /api/v1/subscriptions/status
```

### With subscription

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
      "features": ["..."],
      "maxIncidents": 1
    },
    "usage": {
      "usedIncidents": 0,
      "remainingIncidents": 1,
      "maxIncidents": 1
    },
    "currentPeriodStart": "2026-09-01T00:00:00.000Z",
    "currentPeriodEnd": "2026-10-01T00:00:00.000Z",
    "nextBillingDate": "2026-10-01T00:00:00.000Z"
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

### PAYG only

```json
{
  "subscription": null,
  "payg": {
    "paymentType": "one_time",
    "creditsAvailable": 2
  },
  "entitlement": {
    "hasAccess": true,
    "sources": ["one_time"]
  },
  "message": "No active subscription; pay-as-you-go credits available"
}
```

### Nothing

```json
{
  "subscription": null,
  "payg": {
    "paymentType": "one_time",
    "creditsAvailable": 0
  },
  "entitlement": {
    "hasAccess": false,
    "sources": []
  },
  "message": "No active subscription"
}
```

| Old | New |
|---|---|
| Only `{ subscription }` | Also `payg` + `entitlement` |
| No payment type | `subscription.plan.paymentType` |
| No usage | `subscription.usage` |
| `subscription: null` = no access | Use `entitlement.hasAccess` / `payg.creditsAvailable` |

`remainingIncidents: null` = unlimited.

Show on account/billing page: payment-type badge, incidents used, PAYG credits.

---

## B2. Subscribe (recurring)

Only when `paymentType === "subscription"`.

```http
POST /api/v1/subscriptions/initialize

{
  "planId": "uuid",
  "callbackUrl": "https://your-app.com/subscription/success"
}
```

```json
{
  "authorizationUrl": "https://checkout.paystack.com/xxxxx",
  "reference": "ref_xxxxx",
  "accessCode": "xxxxx"
}
```

Redirect to `authorizationUrl`.

| Status | Meaning |
|---|---|
| `401` | Login required |
| `400` | Plan is one_time → use `initialize-payg` |
| `404` | Plan not found |
| `409` | Already subscribed |

---

## B3. Pay as you go ⚠️ NEW

Only when `paymentType === "one_time"`.

```http
POST /api/v1/subscriptions/initialize-payg

{
  "planId": "uuid",
  "callbackUrl": "https://your-app.com/payg/success"
}
```

Same success shape as B2. Does **not** create a recurring subscription; credits appear on `GET /status` → `payg.creditsAvailable`.

| Status | Meaning |
|---|---|
| `401` | Login required |
| `400` | Plan is subscription → use `initialize` |
| `404` | Product not found |

---

## B4. Cancel

```http
POST /api/v1/subscriptions/cancel
```

```json
{
  "message": "Subscription will be cancelled at period end",
  "subscription": {
    "status": "active",
    "cancelledAt": null,
    "cancelAtPeriodEnd": true
  }
}
```

Access until `currentPeriodEnd`.

---

## B5. Resume

```http
POST /api/v1/subscriptions/resume
```

```json
{
  "message": "Subscription resumed successfully",
  "subscription": {
    "cancelAtPeriodEnd": false
  }
}
```

---

## B6. Transactions

```http
GET /api/v1/subscriptions/transactions
GET /api/v1/subscriptions/transactions?page=1&limit=10
```

No pagination → array. With `page` + `limit` → paginated object.

```json
{
  "id": "uuid",
  "transactionReference": "ref_xxxxx",
  "date": "2026-09-18T00:00:00.000Z",
  "amount": 5000000,
  "currency": "NGN",
  "status": "success",
  "plan": { "name": "Basic Shield", "tier": 1 },
  "paymentMethod": "Paystack"
}
```

Includes subscription and PAYG charges.

---

## Frontend checklist

### Public / pricing

- [ ] Filters: `accountType` + `paymentType`
- [ ] `GET /subscriptions/plans?...`
- [ ] Kobo → Naira; unlimited incidents; hide null interval
- [ ] Empty / loading / error states

### Account

- [ ] CTA → `initialize` vs `initialize-payg` by `paymentType`
- [ ] Login gate before checkout
- [ ] Redirect to `authorizationUrl`
- [ ] Status: parse `subscription` + `payg` + `entitlement`
- [ ] Cancel / resume / transactions

---

## TypeScript

```ts
type AccountType = "individual" | "organization";
type PaymentType = "subscription" | "one_time";

type PublicPlan = {
  id: string;
  name: string;
  tier: number;
  accountType: AccountType;
  paymentType: PaymentType;
  amount: number;
  currency: string;
  interval: string | null;
  description: string;
  features: string[];
  maxIncidents: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type BillingStatus = {
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    plan: {
      id: string;
      name: string;
      tier: number;
      accountType: AccountType;
      paymentType: PaymentType;
      interval: string | null;
      amount: number;
      currency: string;
      features: string[];
      maxIncidents: number | null;
    };
    usage: {
      usedIncidents: number;
      remainingIncidents: number | null;
      maxIncidents: number | null;
    };
    currentPeriodStart: string;
    currentPeriodEnd: string;
    nextBillingDate: string;
  } | null;
  payg: {
    paymentType: "one_time";
    creditsAvailable: number;
  };
  entitlement: {
    hasAccess: boolean;
    sources: PaymentType[];
  };
  message?: string;
};

type CheckoutInitResponse = {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
};
```

---

## Postman

```
GET {{origin}}/subscriptions/plans?accountType=individual&paymentType=subscription
GET {{origin}}/subscriptions/plans?accountType=individual&paymentType=one_time
GET {{origin}}/subscriptions/status
Authorization: Bearer {account_jwt}
```

---

## Related

| Doc | For |
|---|---|
| [`ADMIN_SUBSCRIPTION_PLANS.md`](./ADMIN_SUBSCRIPTION_PLANS.md) | Admin plans + subscribers |
| [`SUBSCRIPTION_FLOW_DOCUMENTATION.md`](./SUBSCRIPTION_FLOW_DOCUMENTATION.md) | Backend / webhooks |
| [`FRONTEND_TICKETS_UI.md`](./FRONTEND_TICKETS_UI.md) | Tickets + eligibility |
