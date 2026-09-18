# Subscription Plans — Frontend UI Guide

Use this to build:

1. **Public / account** plan cards (what users subscribe to)
2. **Admin** plan manager (change amounts, add plans, hide or delete plans)

Base URL: `{API}/api/v1`  
Example: `https://your-api.onrender.com/api/v1`

---

## Amounts

All amounts are **kobo** (integer).

| Stored value | Show in UI |
|---|---|
| `5000000` | ₦50,000 |
| `8000000` | ₦80,000 |

```ts
const naira = amountInKobo / 100;
const display = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
}).format(naira);
```

When the admin types ₦50,000, send `5000000`.

---

## 1. Public plans (user-facing)

For pricing pages and checkout. Returns **active plans only**.

No admin token required.

```
GET /api/v1/subscriptions/plans
GET /api/v1/subscriptions/plans?accountType=individual
GET /api/v1/subscriptions/plans?accountType=organization
GET /api/v1/subscriptions/plans?paymentType=subscription
GET /api/v1/subscriptions/plans?paymentType=one_time
```

`accountType` is optional: `individual` | `organization`.  
`paymentType` is optional: `subscription` | `one_time`.

### Response

Array of plans (not wrapped):

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
    "features": ["Incident reporting via phone/email"],
    "maxIncidents": 1,
    "active": true,
    "createdAt": "2026-09-17T00:00:00.000Z",
    "updatedAt": "2026-09-17T00:00:00.000Z"
  }
]
```

`paystackPlanCode` is **not** returned here. Do not show it to customers.

### UI

- Filters: Individual / Organization × Subscription / Pay as you go
- Card per plan: name, description, formatted price, interval (subscriptions only), feature list, CTA
- `maxIncidents` can be `null` → show “Unlimited”
- Sort by `tier` (already ordered by backend)
- Subscription CTA → `POST /subscriptions/initialize`
- One-time CTA → `POST /subscriptions/initialize-payg`

---

## 2. Admin plan manager

Staff only. Roles: **`SUPER_ADMIN`** or **`ADMIN`**.

Header on every request:

```
Authorization: Bearer {staff_jwt}
Content-Type: application/json
```

This is the **staff** login token (same as other `/admin` routes), not the public account token.

### 2.1 List all plans (including inactive)

```
GET /api/v1/admin/subscription-plans
```

```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "Basic Shield",
      "tier": 1,
      "accountType": "individual",
      "paymentType": "subscription",
      "amount": 5000000,
      "currency": "NGN",
      "interval": "monthly",
      "paystackPlanCode": "PLN_xxxxx",
      "description": "For everyday phone & social media users",
      "features": ["Incident reporting via phone/email"],
      "maxIncidents": 1,
      "active": true,
      "createdAt": "2026-09-17T00:00:00.000Z",
      "updatedAt": "2026-09-17T00:00:00.000Z"
    }
  ]
}
```

Admin UI can show `paystackPlanCode` as read-only (subscriptions only; null for one_time).

### 2.2 Create a plan

```
POST /api/v1/admin/subscription-plans
```

Choose **`paymentType`** for every plan:

| `paymentType` | What happens |
|---|---|
| `subscription` | Creates a Paystack plan (unless you pass `paystackPlanCode`). Recurring billing. |
| `one_time` | No Paystack plan. Customer pays once via `initialize-payg` and gets an incident credit. |

#### Subscription example

```json
{
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
  "active": true
}
```

#### Pay-as-you-go example

```json
{
  "name": "Single Incident Response",
  "tier": 0,
  "accountType": "individual",
  "paymentType": "one_time",
  "amount": 2500000,
  "description": "One incident, no monthly commitment",
  "features": ["Single cyber incident resolution"],
  "maxIncidents": 1,
  "active": true
}
```

Do **not** send `paystackPlanCode` for either (subscriptions auto-create it; one_time never uses it).

| Field | Required | Notes |
|---|---|---|
| `name` | yes | string |
| `tier` | yes | integer ≥ 0 |
| `accountType` | yes | `individual` or `organization` |
| `paymentType` | yes | `subscription` or `one_time` |
| `amount` | yes | kobo, number ≥ 0 |
| `description` | yes | string |
| `features` | yes | string array (can be empty `[]`) |
| `currency` | no | default `NGN` |
| `interval` | no | subscriptions only; default `monthly`. Ignored for `one_time` |
| `maxIncidents` | no | number, or omit / `null` for unlimited. For `one_time` defaults to `1` |
| `active` | no | default `true` |
| `paystackPlanCode` | no | omit; ignored for `one_time` |

Response:

```json
{
  "message": "Subscription plan created",
  "plan": { "id": "uuid", "paymentType": "subscription", "paystackPlanCode": "PLN_xxxxx", "...": "..." }
}
```

Admin UI form fields:

1. Account type — Individual / Organization  
2. Payment type — Subscription / One-time (pay as you go)  
3. Name, amount, features, max incidents, active  
4. Interval — show only when payment type is Subscription  

Public pricing page:

```
GET /api/v1/subscriptions/plans?accountType=individual&paymentType=subscription
GET /api/v1/subscriptions/plans?accountType=individual&paymentType=one_time
```

### 2.3 Update a plan

```
PATCH /api/v1/admin/subscription-plans/{id}
```

Send only fields that changed. You can change `paymentType`, but converting subscription ↔ one_time should be rare — prefer create a new product.

Change price:

```json
{
  "amount": 6000000
}
```

Change copy / features / visibility:

```json
{
  "name": "Basic Shield",
  "description": "Updated description",
  "features": ["Incident reporting via phone/email", "Priority support"],
  "maxIncidents": 2,
  "active": true
}
```

Hide a plan from the public list without deleting:

```json
{
  "active": false
}
```

Response:

```json
{
  "message": "Subscription plan updated",
  "plan": { "id": "uuid", "...": "..." }
}
```

Amount / name / interval / description updates are synced to Paystack for **new** subscribers. Existing subscribers keep their current Paystack plan.

### 2.4 Delete a plan

```
DELETE /api/v1/admin/subscription-plans/{id}
```

No body.

If nobody is subscribed:

```json
{
  "message": "Subscription plan deleted",
  "id": "uuid"
}
```

If people are subscribed, it is **deactivated** instead:

```json
{
  "message": "Plan has existing subscribers, so it was deactivated instead of deleted",
  "id": "uuid",
  "active": false
}
```

In the UI: confirm delete. If the response has `active: false`, tell the admin it was hidden, not removed.

---

## Suggested admin screens

1. **Plans table**
   - Columns: name, account type, tier, price (₦), interval, active, actions
   - Filters: Individual / Organization / All
   - Toggle `active` via PATCH
2. **Create / edit form**
   - Name, account type (select), tier (number)
   - Price input in **naira**, convert to kobo on submit (`naira * 100`)
   - Currency default NGN, interval default monthly
   - Description textarea
   - **Features (important):** do not use a raw textarea or one big text box.
     - Render each feature as a **chip / tag**
     - Input + **Add** button (Enter should also add)
     - Adding one chip after another: type → Add → chip appears → input clears → type the next
     - Each chip has an **x** to remove it
     - Optional: drag to reorder
     - Submit `features` as a `string[]`, e.g. `["Incident reporting", "24–48 hrs response"]`
     - Empty list is allowed (`[]`), but the UI should make it easy to add several quickly
   - Max incidents: number or “Unlimited”
   - Active checkbox
3. **Do not** ask the admin for a Paystack plan code on create

On **public plan cards**, show `features` the same way: a list of chips or compact check-rows, not a paragraph.

---

## Auth errors

| Status | Meaning |
|---|---|
| 401 | Missing or invalid staff token |
| 403 | User is not SUPER_ADMIN / ADMIN |
| 404 | Plan id not found |
| 409 | Paystack plan code already exists (only if you sent one) |

---

## Public vs admin

| | Public `GET /subscriptions/plans` | Admin `GET /admin/subscription-plans` |
|---|---|---|
| Who | Anyone | SUPER_ADMIN / ADMIN |
| Inactive plans | hidden | included |
| Paystack code | hidden | included |
| Use for | pricing / checkout | manage catalog |
