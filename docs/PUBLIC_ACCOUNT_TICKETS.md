# Public Account Tickets — Frontend Guide

Customer portal APIs for tickets opened **for** the logged-in account (`createdFor`).

Staff create and manage tickets via [`FRONTEND_TICKETS_UI.md`](./FRONTEND_TICKETS_UI.md).  
Billing / eligibility context: [`PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md`](./PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md).

Base URL: `{API}/api/v1`  
Auth: portal **account** JWT (`Authorization: Bearer <account-token>`, audience `portal`).

Accounts **cannot** create, assign, escalate, resolve, or close tickets from these routes. They are read-only dashboard views plus email notifications.

---

## Who gets notified (email)

| Event | Customer (`createdFor`) | Assigned responder | Responder admins | Previous responder |
|---|---|---|---|---|
| Ticket created | Yes | — | Yes (new ticket alert) | — |
| Start analysis | Yes | — | — | — |
| Assigned | Yes | Yes | — | — |
| Start responding | Yes | Yes | — | — |
| Escalated | Yes | — | Yes (escalation alert) | — |
| Reassigned | Yes | Yes (new) | — | Yes |
| Resolved | Yes | Yes | — | — |
| Closed | Yes | Yes | — | — |

Customers use the same status-update email template for lifecycle changes.

---

## Auth

| | |
|---|---|
| Guard | `AccountsAuthGuard` |
| Token | Account JWT from `POST /accounts/auth/login` (etc.) |
| Scope | Only tickets where `createdFor.id ===` logged-in account |

Wrong ticket → `403 Forbidden` (`You do not have access to this ticket`).

---

## List my tickets

```http
GET /api/v1/accounts/tickets
GET /api/v1/accounts/tickets?page=1&limit=10
GET /api/v1/accounts/tickets?status=IN_PROGRESS
GET /api/v1/accounts/tickets?status=RESOLVED&page=1&limit=20
```

| Query | Type | Notes |
|---|---|---|
| `page` | number | Optional pagination |
| `limit` | number | Optional page size |
| `status` | enum | Optional filter — see status values below |

### Response shape

```json
{
  "message": "Tickets fetched successfully",
  "data": [
    {
      "ticketId": "iRS-…",
      "title": "Account takeover",
      "tier": "TIER_1",
      "status": "ASSIGNED",
      "severity": "HIGH",
      "createdAt": "2026-09-18T00:00:00.000Z",
      "updatedAt": "2026-09-18T01:00:00.000Z",
      "category": { "id": "uuid", "name": "…", "createdAt": "…" },
      "subCategory": { "id": "uuid", "name": "…", "createdAt": "…" },
      "createdFor": {
        "id": "uuid",
        "email": "customer@example.com",
        "role": "individual",
        "status": "active"
      },
      "entitlementSource": "subscription"
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

`entitlementSource`: `"subscription"` | `"payg"` | `null`.

---

## Get one ticket

```http
GET /api/v1/accounts/tickets/:ticketId
```

Returns the full ticket **without** staff `internalNotes`.

Includes: description, location, reporter, attachments, contact / victim info (when present), `createdBy` (staff summary), optional `assignedResponder`, category / sub-category, `createdFor`, `entitlementSource`.

```json
{
  "message": "Ticket fetched successfully",
  "data": {
    "ticketId": "iRS-…",
    "title": "Account takeover",
    "description": "…",
    "status": "IN_PROGRESS",
    "severity": "HIGH",
    "tier": "TIER_1",
    "location": "Lagos",
    "reporterName": "Jane Doe",
    "attachments": ["https://…"],
    "createdAt": "…",
    "updatedAt": "…",
    "createdBy": {
      "id": "uuid",
      "firstName": "Ada",
      "lastName": "Okeke",
      "role": "RESPONDER_ADMIN"
    },
    "createdFor": {
      "id": "uuid",
      "email": "customer@example.com",
      "role": "individual",
      "status": "active"
    },
    "assignedResponder": {
      "id": "uuid",
      "firstName": "Chi",
      "lastName": "Nwosu",
      "role": "RESPONDER"
    },
    "entitlementSource": "payg",
    "category": { "id": "uuid", "name": "…", "createdAt": "…" },
    "subCategory": { "id": "uuid", "name": "…", "createdAt": "…" }
  }
}
```

---

## Ticket lifecycle (timeline)

```http
GET /api/v1/accounts/tickets/:ticketId/lifecycle?page=1&limit=10
```

Use for the dashboard activity / status timeline.

```json
{
  "message": "Ticket life cycle fetched successfully",
  "data": [
    {
      "id": "uuid",
      "ticketId": "iRS-…",
      "action": "ASSIGNED",
      "notes": "Assigned responder: Chi Nwosu",
      "createdAt": "2026-09-18T01:00:00.000Z",
      "performedBy": {
        "id": "uuid",
        "firstName": "Ada",
        "lastName": "Okeke",
        "role": "RESPONDER_ADMIN"
      }
    }
  ],
  "meta": { "total": 4, "page": 1, "limit": 10, "totalPages": 1 }
}
```

`action` values match ticket status:

`CREATED` · `ANALYSING` · `ASSIGNED` · `REASSIGNED` · `IN_PROGRESS` · `ESCALATED` · `RESOLVED` · `CLOSED` · (`PENDING` reserved)

---

## Dashboard UI suggestions

```
My incidents
┌──────────────────────────────────────────────┐
│ iRS-…  Account takeover     ASSIGNED  HIGH   │
│ Opened 18 Sep · Social media · Subscription  │
└──────────────────────────────────────────────┘

Detail
  Status badge + severity + tier
  Timeline (lifecycle)
  Description / attachments (read-only)
  Assigned responder name (when set)
```

### Acceptance checklist

- [ ] List only shows tickets for the logged-in account
- [ ] Status filter + pagination
- [ ] Detail hides internal staff notes
- [ ] Lifecycle timeline updates as staff move the ticket
- [ ] Empty state when no tickets
- [ ] 403 / error toast when opening another account’s `ticketId`

---

## Status flow (customer-facing labels)

Suggested copy for the portal (staff actions happen on the admin app):

| Status | Customer label |
|---|---|
| `CREATED` | Submitted |
| `ANALYSING` | Under review |
| `ASSIGNED` | Responder assigned |
| `REASSIGNED` | Responder changed |
| `IN_PROGRESS` | In progress |
| `ESCALATED` | Escalated |
| `RESOLVED` | Resolved |
| `CLOSED` | Closed |

---

## Not available on account routes

These remain **staff-only** under `/api/v1/tickets`:

- Create ticket  
- Eligibility check (`GET /tickets/eligibility/:accountId`)  
- Assign / reassign / analyse / respond / escalate / resolve / close  
- Escalation history  

Customers are notified by email when those actions affect their ticket.
