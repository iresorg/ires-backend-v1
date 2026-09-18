# Tickets — Frontend UI Tickets

Work order matters: **categories / sub-categories first**, then ticket create / list / lifecycle UI.

Base URL: `{API}/api/v1`  
Auth: `Authorization: Bearer <token>` on all ticket and category routes.

**This doc = staff / admin app.** Customer portal ticket list/detail → [`PUBLIC_ACCOUNT_TICKETS.md`](./PUBLIC_ACCOUNT_TICKETS.md).

---

## Product model: createdBy vs createdFor

Tickets are opened **by staff**, **for a customer**.

| Field | Who | Table | Status |
|---|---|---|---|
| **`createdBy`** | Internal staff (agent / responder / admin) filing the ticket | `users` | **Shipped** — set from staff JWT. Client does not send it. |
| **`createdFor`** | Customer the incident belongs to | `accounts` | **Shipped** — client sends `accountId`. |

```
Staff User  ──createdBy──►  Ticket  ◄──createdFor──  Account (customer)
                                                      │
                              eligible if account has │
                              ├─ active monthly subscription (with remaining incidents), OR
                              └─ unused pay-as-you-go incident credit
```

### Eligibility (enforced on create)

A ticket may be created **for** an account only if that account:

1. Exists on the system (`accounts`), **and**
2. Either:
   - has an **active subscription** with remaining `maxIncidents` in the current billing period, **or**
   - has a **paid, unused PAYG credit** in `incident_credits`

Check before create (single account):

```
GET /api/v1/tickets/eligibility/:accountId
Authorization: Bearer <staff-jwt>
```

### Customer picker (eligible accounts only)

Use this instead of `GET /admin/users` when creating a ticket — only accounts that can open an incident **right now**.

```
GET /api/v1/tickets/eligible-accounts?search=zeema&page=1&limit=10
GET /api/v1/tickets/eligible-accounts?source=subscription
GET /api/v1/tickets/eligible-accounts?source=payg
```

| Query | Notes |
|---|---|
| `search` | Name or email |
| `page` / `limit` | Pagination (default page 1, limit 10) |
| `source` | Optional `subscription` \| `payg` |

**How incident usage is tracked**

| Source | Tracked how |
|---|---|
| `subscription` | Count of tickets `createdFor` this account in the **current billing period** vs plan `maxIncidents` (`null` = unlimited) |
| `payg` | Unused rows in `incident_credits` (`paygCreditsAvailable`) |
| Lifetime | `ticketsCreatedTotal` = all tickets ever created for the account |

Response `data` item:

```json
{
  "accountId": "uuid",
  "email": "customer@example.com",
  "name": "Zeema Advisory Limited",
  "role": "organization",
  "status": "active",
  "source": "subscription",
  "subscription": {
    "id": "uuid",
    "planName": "Basic Shield",
    "maxIncidents": 1,
    "usedIncidents": 0,
    "remainingIncidents": 1,
    "currentPeriodStart": "…",
    "currentPeriodEnd": "…"
  },
  "paygCreditsAvailable": 0,
  "usedIncidentsThisPeriod": 0,
  "remainingIncidentsThisPeriod": 1,
  "ticketsCreatedTotal": 2
}
```

`source` is which entitlement will be consumed on create (`subscription` preferred when both exist).

Eligibility response `data` (single account):

```json
{
  "eligible": true,
  "accountId": "uuid",
  "email": "customer@example.com",
  "source": "subscription",
  "subscription": {
    "id": "uuid",
    "planName": "Basic Shield",
    "maxIncidents": 1,
    "usedIncidents": 0,
    "remainingIncidents": 1,
    "currentPeriodStart": "...",
    "currentPeriodEnd": "..."
  },
  "paygCreditsAvailable": 0
}
```

`source` is `"subscription"` | `"payg"` | `null`. Prefer subscription entitlement when both exist.

---

## Catalog filters

### Public (active only)

```
GET /api/v1/subscriptions/plans
GET /api/v1/subscriptions/plans?accountType=individual
GET /api/v1/subscriptions/plans?accountType=organization
GET /api/v1/subscriptions/plans?paymentType=subscription
GET /api/v1/subscriptions/plans?paymentType=one_time
GET /api/v1/subscriptions/plans?accountType=individual&paymentType=one_time
```

### Admin (includes inactive)

```
GET /api/v1/admin/subscription-plans
GET /api/v1/admin/subscription-plans?paymentType=subscription
GET /api/v1/admin/subscription-plans?paymentType=one_time
GET /api/v1/admin/subscription-plans?accountType=individual
GET /api/v1/admin/subscription-plans?accountType=organization&paymentType=subscription
```

| Query | Values |
|---|---|
| `accountType` | `individual` \| `organization` |
| `paymentType` | `subscription` \| `one_time` |

| `paymentType` | Meaning |
|---|---|
| `subscription` | Recurring plans (monthly billing via Paystack subscriptions) |
| `one_time` | Pay-as-you-go products (single charge → incident credit) |

Admin creates both types with the same form — pick **account type** + **payment type**.

---

## Pay-as-you-go (one-time) — **admin-managed**, not a fixed product

| | Subscription | One-time (PAYG) |
|---|---|---|
| Catalog `paymentType` | `"subscription"` | `"one_time"` |
| `interval` | e.g. `"monthly"` | `null` (not used) |
| Paystack | Plan code + subscription | One-time charge (no plan) |
| Our `subscriptions` row | Yes | **No** |
| Entitlement | Count tickets in period vs `maxIncidents` | Row in `incident_credits` |

### Checkout

| Flow | Endpoint | Auth |
|---|---|---|
| Subscribe | `POST /subscriptions/initialize` | Account JWT |
| Pay as you go | `POST /subscriptions/initialize-payg` | Account JWT |

Body (both): `{ "planId": "uuid", "callbackUrl": "https://..." }`

### Frontend

- Pricing tabs: **Subscriptions** vs **Pay as you go** (`paymentType` filter) × Individual / Organization
- Admin plan list: same filters on `GET /admin/subscription-plans`
- Admin plan form: required `paymentType` select
- Ticket create: eligibility still uses active sub **or** unused PAYG credit

---

## Category requirement

| Field | Required | Notes |
|---|---|---|
| `categoryId` | **Yes** (UUID) | Ticket create fails validation without it |
| `subCategoryId` | Optional | UUID when provided |

Admin must seed **at least one category** before the create-ticket form is usable.

---

## Recommended build order

```
1. Ticket categories & sub-categories (admin)
2. Ticket list + filters
3. Create ticket form (depends on categories existing)
4. Ticket detail + lifecycle timeline
5. Responder workflow actions (analyse → assign → respond → escalate / resolve / close)
```

---

## Ticket FE-1 — Categories & sub-categories (do first)

**Goal:** Admin can create and manage categories so ticket create has valid `categoryId` / `subCategoryId` options.

### APIs

| Method | Path | Body |
|---|---|---|
| `POST` | `/ticket-categories` | `{ "name": string, "subCategories"?: string[] }` |
| `GET` | `/ticket-categories` | — (includes nested `subCategories`) |
| `GET` | `/ticket-categories/:id` | — |
| `PATCH` | `/ticket-categories/:id` | `{ "name": string }` |
| `DELETE` | `/ticket-categories/:id` | — |
| `POST` | `/ticket-categories/:categoryId/sub-categories` | `{ "name": string }` |
| `PATCH` | `/ticket-categories/sub-categories/:id` | `{ "name": string }` |
| `DELETE` | `/ticket-categories/sub-categories/:id` | — |

### UI acceptance

- [ ] Categories list with nested sub-categories
- [ ] Create category (name only, or name + optional initial sub-category names)
- [ ] Add / rename / delete sub-category under a category
- [ ] Rename / delete category
- [ ] Empty state: “No categories yet — create one before tickets can be filed”
- [ ] After create, refresh list so ticket form dropdowns stay in sync

### Notes

- Create-with-subs: one `POST` with `subCategories: ["Phishing", "SIM swap"]` is enough for initial setup.
- Deleting a category sets ticket FKs to null on the backend (`onDelete: SET NULL`) — warn in UI before delete.

---

## Ticket FE-2 — Ticket list (admin / staff)

**Goal:** Paginated ticket inbox for ops / responders.

**Already paginated on the backend** — FE must pass `page` / `limit` and render from `pagination`.

### API

```
GET /tickets?page=1&limit=10
GET /tickets?page=1&limit=10&status=CREATED
```

| Query | Required | Notes |
|---|---|---|
| `page` | no | Default `1` |
| `limit` | no | Default `10` (min `5` if sent) |
| `status` | no | Filter |

`status` values:

`CREATED` | `PENDING` | `ANALYSING` | `ASSIGNED` | `REASSIGNED` | `IN_PROGRESS` | `RESOLVED` | `CLOSED` | `ESCALATED`

### Response shape

```json
{
  "message": "Tickets fetched successfully",
  "data": [
    {
      "ticketId": "iRS-…",
      "title": "…",
      "status": "CREATED",
      "severity": null,
      "tier": "TIER_1",
      "category": { "id": "uuid", "name": "…", "createdAt": "…" },
      "subCategory": { "id": "uuid", "name": "…", "createdAt": "…" },
      "createdFor": {
        "id": "uuid",
        "email": "customer@example.com",
        "role": "individual",
        "status": "active"
      },
      "entitlementSource": "subscription",
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "pagination": {
    "totalItems": 42,
    "totalPages": 5,
    "currentPage": 1,
    "nextPage": 2,
    "prevPage": null
  }
}
```

### Summary fields (list row)

`ticketId`, `title`, `status`, `severity`, `tier`, `category`, `subCategory`, **`createdFor`**, **`entitlementSource`**, `createdAt`, `updatedAt`

### UI acceptance

- [ ] Table / list with status filter + **pagination** (`pagination.totalPages` / next-prev)
- [ ] Show category / sub-category names
- [ ] Show customer (`createdFor.email`) and entitlement (`subscription` / `payg`)
- [ ] Click row → detail
- [ ] Status badges for each enum value

Same pagination pattern on:

- `GET /tickets/:ticketId/lifecycle?page=&limit=`
- `GET /tickets/escalation-history?page=&limit=`

Customer portal list (separate app) → [`PUBLIC_ACCOUNT_TICKETS.md`](./PUBLIC_ACCOUNT_TICKETS.md) (`GET /accounts/tickets`).

---

## Ticket FE-3 — Create ticket (after FE-1)

**Goal:** Staff opens an incident ticket **for** an eligible customer account, with category selection.

### Actors on create

| Role | Field | Source |
|---|---|---|
| Staff filing the ticket | `createdBy` | Staff JWT — **do not send** |
| Customer the ticket is for | `createdFor` | Staff sends **`accountId`** (required) |

### API

```
POST /tickets
Content-Type: multipart/form-data
Authorization: Bearer <staff-jwt>
```

Required fields:

| Field | Type |
|---|---|
| `accountId` | UUID — customer account (`createdFor`) |
| `title` | string |
| `type` | string |
| `description` | string |
| `location` | string |
| `reporterName` | string |
| `categoryId` | UUID |

Optional: `subCategoryId`, `internalNotes`, `attachments[]`, **`contactInformation`**, **`victimInformation`**

### Contact & victim (not single text inputs)

These are **optional nested objects**, not one free-text field each. Send as JSON string fields in multipart (or nested form keys — see note below).

**`contactInformation`** — who to reach about the incident:

| Field | Required if object sent | Type |
|---|---|---|
| `email` | yes | string |
| `phone` | yes | string |
| `address` | yes | string |

**`victimInformation`** — person affected (when different / needed):

| Field | Required if object sent | Type |
|---|---|---|
| `name` | yes | string |
| `phone` | yes | string |
| `address` | yes | string |
| `email` | yes | string |
| `age` | no | number |
| `gender` | no | string |

Example (multipart): separate UI inputs → build objects before submit:

```ts
form.append("contactInformation", JSON.stringify({
  email: "contact@example.com",
  phone: "+234…",
  address: "Lagos",
}));

form.append("victimInformation", JSON.stringify({
  name: "Jane Doe",
  phone: "+234…",
  address: "Abuja",
  email: "jane@example.com",
  age: 28,
  gender: "female",
}));
```

UI: one **section** each (Contact / Victim), with the fields above — not a single textarea labeled “contact information”.

Omit both entirely when not collected.

### UI acceptance

- [ ] Block create if categories empty → link to FE-1
- [ ] Customer picker → **`GET /tickets/eligible-accounts?search=`** (not all admin users)
- [ ] Show plan / remaining incidents / PAYG credits from each row
- [ ] Optional: confirm with `GET /tickets/eligibility/:accountId` before submit
- [ ] Disable submit when nothing selected / ineligible
- [ ] Category required; sub-category when parent has children
- [ ] Contact section: email / phone / address (optional section)
- [ ] Victim section: name / phone / address / email (+ optional age, gender)
- [ ] On success show `ticketId`, `createdBy`, `createdFor`, `entitlementSource`
- [ ] On success, note that the customer is emailed and can see the ticket in their portal

---

## Ticket FE-4 — Ticket detail + lifecycle

### APIs

```
GET /tickets/:ticketId
GET /tickets/:ticketId/lifecycle?page=1&limit=10
```

### Detail includes

Full ticket fields plus `createdBy`, optional `assignedResponder`, `category`, `subCategory`, attachments, victim / contact info.

Lifecycle entries: `action` (status), `performedBy`, `notes`, `createdAt`.

### UI acceptance

- [ ] Header: ticket id, title, status, severity, tier
- [ ] Meta: category, sub-category, reporter, location, **created by** (staff), **created for** (customer + plan/PAYG)
- [ ] Attachment links
- [ ] Timeline of lifecycle events (newest first or chronological — pick one and stick to it)

---

## Ticket FE-5 — Responder workflow actions

Status flow the UI should enforce (backend also validates some transitions):

```
CREATED → start-analysis → ANALYSING
ANALYSING → assign → ASSIGNED
ASSIGNED / … → start-responding → IN_PROGRESS
IN_PROGRESS → escalate → ESCALATED
ESCALATED → reAssign → REASSIGNED
… → resolve → RESOLVED
… → close → CLOSED
```

| Action | Method | Path | Body highlights | Roles (where guarded) |
|---|---|---|---|---|
| Start analysis | `PATCH` | `/tickets/:id/start-analysis` | `{ notes? }` | `RESPONDER_ADMIN`, `SUPER_ADMIN` |
| Assign | `PATCH` | `/tickets/:id/assign` | `assignedResponderId`, `tier`, `severity`, `notes?` | `RESPONDER_ADMIN`, `SUPER_ADMIN` |
| Start responding | `PATCH` | `/tickets/:id/start-responding` | `{ notes? }` | auth |
| Escalate | `PATCH` | `/tickets/:id/escalate` | `{ escalationReason }` | auth |
| Reassign | `PATCH` | `/tickets/:id/reAssign` | same shape as assign | `RESPONDER_ADMIN`, `SUPER_ADMIN` |
| Resolve | `PATCH` | `/tickets/:id/resolve` | `{ notes? }` | auth |
| Close | `PATCH` | `/tickets/:id/close` | `{ notes? }` | auth |

Enums for assign / reassign:

- `tier`: `TIER_1` | `TIER_2`
- `severity`: `LOW` | `MEDIUM` | `HIGH`

### Extra admin view

```
GET /tickets/escalation-history?page=1&limit=10
```

Roles: `RESPONDER_ADMIN`, `SUPER_ADMIN`.

### UI acceptance

- [ ] Only show actions valid for current status
- [ ] Assign / reassign: responder picker + tier + severity required
- [ ] Escalate: reason required
- [ ] After each action, refresh detail + lifecycle
- [ ] Escalation history page for admins

---

## Email notifications (backend — no FE work)

Staff actions trigger emails automatically. Admin UI does **not** need a “send email” control. Optionally show a subtle toast like “Customer / responder notified” after success.

| Staff action | Customer (`createdFor`) | Assigned responder | Other |
|---|---|---|---|
| Create ticket | Yes — ticket opened | — | Responder admins get new-ticket alert |
| Start analysis | Yes | — | — |
| Assign | Yes | Yes — assigned to you | — |
| Start responding | Yes | Yes | — |
| Escalate | Yes | — | Responder admins get escalation alert |
| Reassign | Yes | Yes — new assignee | Previous responder notified |
| Resolve | Yes | Yes | — |
| Close | Yes | Yes | — |

UI copy tips:

- On create success: customer receives a “ticket created” email; they can also see it under portal **My incidents** (`/accounts/tickets`).
- On assign / reassign: both customer and responder get mail — no separate notify step.
- Detail view can show `createdFor.email` so staff know who is being notified.

---

## Suggested Linear / Jira ticket titles

1. **[Tickets] Admin: category & sub-category CRUD** (blocker for create)
2. **[Tickets] List + status filter + pagination** (show `createdFor`)
3. **[Tickets] Create ticket form (staff + accountId + eligibility)**
4. **[Tickets] Detail view + lifecycle timeline** (createdBy + createdFor + entitlementSource)
5. **[Tickets] Responder actions**
6. **[Tickets] Escalation history (admin)**
7. **[Portal] Account tickets dashboard** (see `PUBLIC_ACCOUNT_TICKETS.md`)
8. **[Billing] PAYG pricing card + `initialize-payg` checkout**

---

## Quick reference — create payload

```http
POST /api/v1/tickets
Authorization: Bearer <staff-user-jwt>
Content-Type: multipart/form-data
```

- `accountId` = `<customer account uuid>` ← **createdFor**
- `title` / `type` / `description` / `location` / `reporterName`
- `categoryId` = `<uuid>`
- `subCategoryId` = optional
- `contactInformation` = optional object `{ email, phone, address }` (not one text field)
- `victimInformation` = optional object `{ name, phone, address, email, age?, gender? }`
- `attachments` = files

`createdBy` = staff from token. Eligibility + credit consumption happen server-side.  
On success the **customer** is emailed and can track the ticket in the account portal.
