# Admin Financials — Frontend Guide

Admin money views so ops rarely need the Paystack dashboard.

Base URL: `{API}/api/v1`  
Auth: staff JWT — roles `SUPER_ADMIN` | `ADMIN`

Amounts are **kobo** unless a `*Naira` helper is present.

```ts
const naira = amountInKobo / 100;
```

Related: [`ADMIN_SUBSCRIPTION_PLANS.md`](./ADMIN_SUBSCRIPTION_PLANS.md), [`PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md`](./PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md)

---

## Source of truth (the right model)

| Data | Source of truth |
|---|---|
| **Revenue / ledger / PAYG vs sub** | Local `subscription_transactions` |
| **MRR / active subscribers / PAYG credits** | Local subscriptions + credits |
| **Wallet balance** | Live Paystack |
| **Settlements** | Live Paystack |
| **`paystackPeriod` on overview** | Live Paystack — **reconciliation only** (compare gap vs local) |

### First-time / catch-up

If revenue is ₦0 but Paystack has money, **backfill once**:

```http
POST /api/v1/admin/financials/sync-paystack?from=2026-01-01&to=2026-09-18
```

Then refresh overview. Going forward, webhooks + pending rows on checkout keep the local ledger updated.

---

## What comes from where

| UI block | Endpoint |
|---|---|
| Revenue cards, chart, recent local txs | `GET /admin/financials/overview` |
| Payment ledger | `GET /admin/financials/transactions` |
| Backfill local from Paystack | `POST /admin/financials/sync-paystack` |
| Wallet balance | `GET /admin/financials/paystack/balance` |
| Settlements | `GET /admin/financials/paystack/settlements` |

### Why balance ≠ revenue

| | |
|---|---|
| **Paystack balance** | Cash in wallet **now** (all-time, fees/settlements applied) |
| **Period revenue** | Successful charges in From→To from the **local ledger** |
| **`paystackPeriod.gapVsLocal`** | Paystack period volume minus local — should shrink after sync |

---

## Sync Paystack → local

```http
POST /api/v1/admin/financials/sync-paystack?from=2026-03-18&to=2026-09-18
```

```json
{
  "from": "…",
  "to": "…",
  "imported": 12,
  "updated": 3,
  "skipped": 1,
  "errors": ["No local account for ref_xxx (someone@elsewhere.com)"],
  "message": "Local ledger synced from Paystack. Refresh financials overview — revenue now uses local rows."
}
```

Skipped rows usually mean the Paystack customer email isn’t an `accounts` row in our DB.

UI: “Sync from Paystack” button on Financials → then reload overview.

---

## Overview

```http
GET /api/v1/admin/financials/overview
GET /api/v1/admin/financials/overview?from=2026-01-01&to=2026-09-18&months=6
```

### Response (key fields)

```json
{
  "currency": "NGN",
  "range": { "from": "…", "to": "…" },
  "revenueSource": "local",
  "note": "Revenue cards use the local payment ledger…",
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
  "local": { "revenueTotal": 15000000, "successCount": 12 },
  "paystackPeriod": {
    "revenueTotal": 15200000,
    "successCount": 13,
    "gapVsLocal": 200000
  },
  "paystackError": null,
  "revenueByMonth": [
    { "month": "2026-04", "subscription": 2000000, "payg": 500000, "total": 2500000 }
  ],
  "recentTransactions": []
}
```

Bind **Total Revenue** cards to `summary.*` (local). Optionally show a small “Paystack gap” from `paystackPeriod.gapVsLocal`.

---

## Transactions ledger

```http
GET /api/v1/admin/financials/transactions?page=1&limit=10
GET /api/v1/admin/financials/transactions?status=success&paymentType=one_time
GET /api/v1/admin/financials/transactions?search=zeema&from=2026-01-01&to=2026-09-18
```

With `page` + `limit` → `{ data, total, page, limit, totalPages, nextPage }`.

---

## Paystack balance / settlements (live)

```http
GET /api/v1/admin/financials/paystack/balance
GET /api/v1/admin/financials/paystack/settlements?page=1&perPage=20
```

Keep these in a separate “Paystack wallet” section — not the revenue cards.

---

## FE acceptance

- [ ] Revenue cards from `summary` (local)
- [ ] Optional reconcile badge when `paystackPeriod.gapVsLocal !== 0`
- [ ] “Sync from Paystack” → `POST …/sync-paystack` → refresh overview
- [ ] Transactions table from local ledger
- [ ] Separate Paystack balance + settlements section
- [ ] Amounts shown as ₦ (kobo / 100)

---

## Suggested nav

```
Admin
  ├── Overview (ops)
  ├── Financials
  ├── Subscribers
  └── Subscription plans
```
