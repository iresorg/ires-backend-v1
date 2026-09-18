# Admin Financials — Frontend Guide

Admin money views so ops rarely need the Paystack dashboard.

Base URL: `{API}/api/v1`  
Auth: staff JWT — roles `SUPER_ADMIN` | `ADMIN`

Amounts from **our DB** are **kobo**. Paystack proxy responses include both kobo and `*Naira` helpers where useful.

```ts
const naira = amountInKobo / 100;
```

Related: [`ADMIN_SUBSCRIPTION_PLANS.md`](./ADMIN_SUBSCRIPTION_PLANS.md), [`PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md`](./PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md)

---

## What comes from where

| UI block | Source | Endpoint |
|---|---|---|
| Revenue, success/fail, PAYG vs sub, MRR, monthly chart | Local `subscription_transactions` + active subs | `GET /admin/financials/overview` |
| Payment ledger / search | Local transactions | `GET /admin/financials/transactions` |
| Wallet balance | **Live Paystack** | `GET /admin/financials/paystack/balance` |
| Settlements (bank payouts) | **Live Paystack** | `GET /admin/financials/paystack/settlements` |

Refunds are **not** tracked yet.

---

## Overview

```http
GET /api/v1/admin/financials/overview
GET /api/v1/admin/financials/overview?from=2026-01-01&to=2026-09-18&months=6
```

| Query | Default | Notes |
|---|---|---|
| `from` | ~6 months ago | ISO date |
| `to` | today | ISO date |
| `months` | `6` | Chart length (1–24) |

### Response

```json
{
  "currency": "NGN",
  "range": { "from": "…", "to": "…" },
  "summary": {
    "revenueTotal": 15000000,
    "revenueSubscription": 10000000,
    "revenuePayg": 5000000,
    "successCount": 12,
    "failedCount": 2,
    "pendingCount": 1,
    "mrr": 5000000,
    "activeSubscribers": 8,
    "paygCreditsAvailable": 3
  },
  "revenueByMonth": [
    {
      "month": "2026-04",
      "subscription": 2000000,
      "payg": 500000,
      "total": 2500000
    }
  ],
  "recentTransactions": [
    {
      "id": "uuid",
      "reference": "ref_xxx",
      "status": "success",
      "amount": 5000000,
      "amountNaira": 50000,
      "currency": "NGN",
      "paymentType": "subscription",
      "paymentMethod": "card",
      "accountId": "uuid",
      "accountEmail": "customer@example.com",
      "accountName": "Jane Doe",
      "planId": "uuid",
      "planName": "Basic Shield",
      "subscriptionId": "uuid",
      "createdAt": "…"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `revenue*` | Sum of **successful** charges in range (kobo) |
| `mrr` | Approx monthly recurring = sum of active recurring plan amounts |
| `paygCreditsAvailable` | Unused PAYG incident credits (all accounts) |
| `paymentType` | `subscription` \| `one_time` |

### UI cards (suggested)

- Total revenue (range)  
- Subscription vs PAYG split  
- Success / failed / pending counts  
- MRR + active subscribers  
- Unused PAYG credits  
- Bar/line chart from `revenueByMonth`

---

## Transactions ledger

```http
GET /api/v1/admin/financials/transactions?page=1&limit=10
GET /api/v1/admin/financials/transactions?status=success&paymentType=one_time
GET /api/v1/admin/financials/transactions?search=zeema&from=2026-01-01&to=2026-09-18
```

| Query | Values |
|---|---|
| `page` / `limit` | Pagination |
| `status` | `success` \| `failed` \| `pending` |
| `paymentType` | `subscription` \| `one_time` |
| `search` | Email, name, or Paystack reference |
| `from` / `to` | Date range |

### Response (with page + limit)

```json
{
  "data": [ /* same shape as recentTransactions */ ],
  "total": 42,
  "limit": 10,
  "page": 1,
  "totalPages": 5,
  "nextPage": 2
}
```

Without `page`/`limit`, returns `{ "transactions": [...], "total": n }`.

---

## Paystack balance (live)

```http
GET /api/v1/admin/financials/paystack/balance
```

```json
{
  "source": "paystack",
  "balances": [
    {
      "currency": "NGN",
      "balance": 12500000,
      "balanceNaira": 125000
    }
  ]
}
```

Show as “Available in Paystack” — may lag settlements; not the same as local revenue.

---

## Paystack settlements (live)

```http
GET /api/v1/admin/financials/paystack/settlements?page=1&perPage=20
GET /api/v1/admin/financials/paystack/settlements?from=2026-01-01&to=2026-09-18
```

```json
{
  "source": "paystack",
  "settlements": [
    {
      "id": 123,
      "status": "success",
      "currency": "NGN",
      "totalAmount": 10000000,
      "totalAmountNaira": 100000,
      "effectiveAmount": 9850000,
      "settlementDate": "2026-09-10T00:00:00.000Z",
      "deductedAmount": 0,
      "settlementFee": 150000
    }
  ],
  "meta": { "total": 5, "skipped": 0, "perPage": 20, "page": 1 }
}
```

Use for “Money to bank” history.

---

## FE acceptance

- [ ] Financials page with overview cards + monthly chart  
- [ ] Transactions table with status / paymentType / search / date filters + pagination  
- [ ] Display amounts as ₦ (divide kobo by 100)  
- [ ] Separate “Paystack” section: balance + settlements (handle API errors gracefully)  
- [ ] Link row → customer / subscriber if useful  
- [ ] Note: MRR is approximate (active plan prices; no proration)

---

## Suggested nav

```
Admin
  ├── Overview (ops tickets/users)
  ├── Financials          ← this doc
  ├── Subscribers
  └── Subscription plans
```
