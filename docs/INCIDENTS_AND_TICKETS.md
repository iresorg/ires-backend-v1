# Incidents and tickets

Base URL: `{API}/api/v1`

| App | Login | Header |
|---|---|---|
| Customer website and dashboard | `POST /accounts/auth/login` | `Authorization: Bearer <account token>` |
| Staff dashboard | `POST /auth/login` | `Authorization: Bearer <staff token>` |

`PUBLIC_FRONTEND_URL` is the customer site origin. The new-account email links to `{PUBLIC_FRONTEND_URL}/login`.

The public form is still `POST /incident-reports`. It now saves the incident and attaches it to a portal account. See [INCIDENT_REPORT_API.md](./INCIDENT_REPORT_API.md) for the form fields.

---

## Password flag on portal accounts

A new account created from an incident has `mustChangePassword: true`. Existing accounts stay `false`.

### Login

`POST /accounts/auth/login`

```json
{ "email": "ada@northwind.example", "password": "temporary" }
```

`200`

```json
{
  "token": "jwt",
  "mustChangePassword": true
}
```

If `mustChangePassword` is `true`, the customer app goes to change-password and does not open the rest of the dashboard.

### Profile

`GET /accounts/auth/me`

`mustChangePassword` is on the profile object with `id`, `email`, `role`, `emailVerifiedAt`, `lastLoginAt`, and `createdAt`.

### Change password

`POST /accounts/auth/change-password`

```json
{
  "currentPassword": "temporary",
  "newPassword": "chosen-password"
}
```

`newPassword` minimum is 6 characters.

`200`

```json
{
  "message": "Password changed successfully",
  "mustChangePassword": false,
  "token": "new-jwt"
}
```

Use the new `token`. The previous token is revoked.

---

## Incident object

List rows and the detail `incident` object use the same fields.

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `reference` | string | `IR-YYYYMMDD-XXXXXX` |
| `accountId` | string | Owner account |
| `status` | string | `OPEN` or `CLOSED` |
| `severity` | string | `Critical` \| `High` \| `Medium` \| `Low` |
| `incidentType` | string | Free text, max 200 |
| `ongoing` | string | `Yes` \| `No` \| `Not sure` |
| `name` | string | |
| `organization` | string or null | Optional on create |
| `phone` | string | |
| `email` | string | Email on the report |
| `detectedAt` | string or null | |
| `affectedSystems` | string or null | |
| `description` | string | |
| `assignedAgent` | object or null | `{ id, firstName, lastName }` |
| `ticketId` | string or null | |
| `ticketStatus` | string or null | Ticket status when `ticketId` is set |
| `createdByStaffId` | string or null | Staff responses only. Omitted for the customer |
| `createdAt` | string | ISO date |
| `updatedAt` | string | ISO date |

`OPEN` can still be edited. `CLOSED` is set when the linked ticket is closed.

Paginated lists:

```json
{
  "message": "Incidents fetched",
  "data": [],
  "total": 0,
  "limit": 10,
  "page": 1,
  "totalPages": 0,
  "nextPage": null
}
```

`page` starts at 1. If you send `limit`, the minimum is 5. Omit `limit` to get 10.

---

## Create an incident

### Website

`POST /api/v1/incident-reports`

No auth. Body is the public report (`severity`, `incidentType`, `ongoing`, `name`, `phone`, `email`, optional `organization`, `detectedAt`, and `affectedSystems`, `description`, `confirmed: true`).

`201`

```json
{
  "message": "Incident report received",
  "incidentReference": "IR-20261102-A1B2C3",
  "accountCreated": true
}
```

| `accountCreated` | Meaning |
|---|---|
| `true` | No account existed. An `individual` account was created and a temporary password was emailed. |
| `false` | The email already had an account. The incident was added to it. No password email. |

The password is never in the response. Tell a new visitor to open the email and sign in. Tell an existing visitor to sign in to follow the incident.

The sign-in email subject is `Your iRES account is ready`. It contains the email, temporary password, and `{PUBLIC_FRONTEND_URL}/login`.

Support still receives the incident email. The reporter still receives `We received your incident report — {reference}`.

### Staff, for a caller

`POST /api/v1/incident-reports/staff`

Auth: staff token. Roles: `SUPER_ADMIN`, `ADMIN`, `AGENT_ADMIN`.

Same body and same `201` as the public form. Same account lookup.

---

## Customer dashboard — Incidents tab

Auth: account token.

### Create

```http
POST /api/v1/accounts/incidents
```

Same body as the public form, except `email` is optional and ignored. The incident is saved on the signed-in account, using that account’s email.

No new account is created, and no password email is sent. Support receives the incident email. The signed-in customer receives `Incident created — {reference}`. That email names the reference, severity, and type. It does not include a password or a sign-in link.

`201`

```json
{
  "message": "Incident report received",
  "incidentReference": "IR-20261102-A1B2C3",
  "accountCreated": false,
  "incident": {}
}
```

`incident` is the object above, without `createdByStaffId`.

### List

```http
GET /api/v1/accounts/incidents?page=1&limit=10
GET /api/v1/accounts/incidents?status=OPEN
```

`status` is optional: `OPEN` or `CLOSED`. Only this account’s incidents.

### Detail

```http
GET /api/v1/accounts/incidents/:id
```

`200`

```json
{
  "message": "Incident fetched",
  "incident": {}
}
```

`incident` is the object above, without `createdByStaffId`.

### Update

```http
PATCH /api/v1/accounts/incidents/:id
```

Body, all optional:

| Field | Max |
|---|---|
| `ongoing` | `Yes` \| `No` \| `Not sure` |
| `phone` | 40 |
| `detectedAt` | 40 |
| `affectedSystems` | 2000 |
| `description` | 8000 |

`200`

```json
{
  "message": "Incident updated",
  "incident": {}
}
```

Allowed only while the incident is `OPEN` and the linked ticket is not `CLOSED`. Otherwise `409` with `Incident is closed`. Hide the form in that case.

Another account’s incident is `403` with `You do not have access to this incident`.

---

## Staff dashboard — Incidents tab

Auth: staff token.

| Action | Super admin, admin | Agent admin | Agent |
|---|---|---|---|
| Queue and detail | All incidents | All incidents | Assigned to them only |
| Update | Yes | Yes | Assigned incident only |
| Assign agent | Yes | Yes | No |
| Link ticket | Yes | Yes | No |
| Create for an email | Yes | Yes | No |

### Queue

```http
GET /api/v1/incident-reports/queue?page=1&limit=10
GET /api/v1/incident-reports/queue?status=OPEN
GET /api/v1/incident-reports/queue?assigned=false
```

`assigned=false` is the unassigned queue. `assigned=true` is incidents that already have an agent. Agents always see only their own rows; `assigned` is ignored for them.

`200` with `message: "Incidents fetched"` and the pagination fields. Each item includes `createdByStaffId`.

### Detail and update

```http
GET /api/v1/incident-reports/:id
PATCH /api/v1/incident-reports/:id
```

Staff may also send `severity` and `incidentType` on the patch. Same `409` when the incident or its ticket is closed.

Detail `200`: `{ "message": "Incident fetched", "incident": {} }`

Update `200`: `{ "message": "Incident updated", "incident": {} }`

### Assign an agent

```http
PATCH /api/v1/incident-reports/:id/assign
```

```json
{ "agentId": "staff-user-uuid" }
```

`agentId` must be a user with role `AGENT`. The incident stays `OPEN`.

`200`

```json
{
  "message": "Incident assigned",
  "incident": {}
}
```

The agent email subject is `Incident assigned to you — {reference}`. The body has reference, severity, type, organization, and the customer email.

`400` `agentId must be an agent`

`500` `Could not send the assignment email.`

### Link a ticket

```http
POST /api/v1/incident-reports/:id/ticket
```

```json
{ "ticketId": "iRS-..." }
```

The ticket’s customer (`createdFor`) must be the incident’s account.

`200`

```json
{
  "message": "Incident linked to ticket",
  "incident": {}
}
```

`400` `Ticket customer does not match the incident`

`404` `Ticket not found` or `Incident not found`

You can also pass `incidentId` on `POST /api/v1/tickets` together with `accountId`. The new ticket is linked when those accounts match. Ticket eligibility is unchanged.

Closing the ticket closes the incident:

```http
PATCH /api/v1/tickets/:ticketId/close
```

Every incident with that `ticketId` becomes `CLOSED`.

---

## Tickets queue

```http
GET /api/v1/tickets/queue?page=1&limit=10
```

Roles: `SUPER_ADMIN`, `ADMIN`, `AGENT_ADMIN`, `RESPONDER_ADMIN`.

Rows are tickets in `CREATED` or `PENDING` with no assigned responder.

`200`

```json
{
  "message": "Ticket queue fetched",
  "data": [
    {
      "ticketId": "iRS-...",
      "title": "Ransomware on file server",
      "status": "CREATED",
      "createdAt": "2026-11-02T12:00:00.000Z",
      "account": {
        "id": "uuid",
        "email": "ada@northwind.example",
        "name": "Ada Okonkwo"
      },
      "incident": {
        "id": "uuid",
        "reference": "IR-20261102-A1B2C3"
      }
    }
  ],
  "total": 1,
  "limit": 10,
  "page": 1,
  "totalPages": 1,
  "nextPage": null
}
```

`account` and `incident` are `null` when missing. Assign, escalate, resolve, and close stay on the existing ticket routes.

---

## Errors

| Status | Message |
|---|---|
| `400` | Invalid field, or `agentId must be an agent`, or `Ticket customer does not match the incident` |
| `401` | Missing or invalid token |
| `403` | `You do not have access to this incident` or the role is not allowed |
| `404` | `Incident not found` or `Ticket not found` |
| `409` | `Incident is closed` |
| `429` | Public submit only. More than 5 reports an hour from the same IP |
| `500` | `Could not send the report.` or `Could not send the new password email.` or `Could not send the assignment email.` |
