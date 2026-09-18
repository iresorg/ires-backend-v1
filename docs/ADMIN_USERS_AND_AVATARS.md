# Admin Users — Agents, Responders & Avatars

Frontend guide for the **staff / admin app** user management UI (agents, responders, and avatar uploads).

Base URL: `{API}/api/v1`  
Auth: `Authorization: Bearer <staff-jwt>` (audience = staff users, not portal accounts)

Related: tickets assign responder picker → [`FRONTEND_TICKETS_UI.md`](./FRONTEND_TICKETS_UI.md)

---

## Roles

| Role | Who |
|---|---|
| `SUPER_ADMIN` | Full access to all staff users |
| `ADMIN` | General admin (not scoped in users controller the same way) |
| `AGENT_ADMIN` | Manage **agents only** (`AGENT`) |
| `AGENT` | Field / intake agent |
| `RESPONDER_ADMIN` | Manage **responders only** (`RESPONDER_TIER_1`, `RESPONDER_TIER_2`) |
| `RESPONDER_TIER_1` | Tier 1 responder |
| `RESPONDER_TIER_2` | Tier 2 responder |

Status values: `active` | `inactive`

**Cannot** create or update anyone to `SUPER_ADMIN` via these APIs.

---

## Who can call what

| Action | `SUPER_ADMIN` | `AGENT_ADMIN` | `RESPONDER_ADMIN` | Any authenticated staff |
|---|---|---|---|---|
| List users `GET /users` | Yes | No | No | No |
| Get by id `GET /users/:id` | Yes | Agents only | Responders only | No |
| Create `POST /users` | Yes | Role must be `AGENT` | Role must be `RESPONDER_TIER_1` or `RESPONDER_TIER_2` | No |
| Update `PUT /users/:id` | Yes | Agents only | Responders only | No |
| Delete `DELETE /users/:id` | Yes | Agents only | Responders only | No |
| Activate / deactivate | Yes | Agents only | Responders only | No |
| Own profile `GET/PUT /users/profile` | — | — | — | Yes |

`403` when an admin tries to manage outside their scope.

---

## Shared user object (response)

Used in get / update / activate / deactivate / profile:

```json
{
  "id": "uuid",
  "firstName": "Ada",
  "lastName": "Okeke",
  "email": "ada@ires.example",
  "role": "AGENT",
  "status": "active",
  "avatar": {
    "publicId": "ires/avatars/abc123",
    "url": "https://res.cloudinary.com/…/abc123.jpg"
  },
  "lastLogin": "2026-09-18T00:00:00.000Z",
  "createdAt": "2026-09-01T00:00:00.000Z",
  "updatedAt": "2026-09-18T00:00:00.000Z"
}
```

| Field | Notes |
|---|---|
| `avatar` | Optional. After upload, always `{ publicId, url }` — FE displays `avatar.url` |
| `password` | **Never** returned |
| `status` | `active` / `inactive` |

---

## Avatar upload rules (all create / update / profile)

| | |
|---|---|
| Content-Type | **`multipart/form-data`** (not JSON) |
| File field name | **`avatar`** (exact) |
| Optional | Yes — omit field to leave avatar unchanged / unset on create |
| Do **not** send | JSON `avatar: { publicId, url }` from the client — server uploads and sets that |

Typical FormData:

```ts
const form = new FormData();
form.append("firstName", "Ada");
form.append("lastName", "Okeke");
form.append("email", "ada@ires.example");
form.append("role", "AGENT");          // create / admin update
if (file) form.append("avatar", file); // File / Blob
```

Use the same pattern for profile and `PUT /users/:id` (only include fields you change).

---

## List users (paginated) — Super Admin

```http
GET /api/v1/users?page=1&limit=10
GET /api/v1/users?page=1&limit=10&role=AGENT
GET /api/v1/users?page=1&limit=10&role=RESPONDER_TIER_1
GET /api/v1/users?search=ada
GET /api/v1/users?role=AGENT&search=okeke&page=1&limit=10
```

| Query | Notes |
|---|---|
| `page` | Default `1` |
| `limit` | Default `10` |
| `role` | Filter by one `Role` enum value |
| `search` | Name / email search (server-side) |

**Roles for agent / responder screens:**

```
?role=AGENT
?role=RESPONDER_TIER_1
?role=RESPONDER_TIER_2
?role=AGENT_ADMIN
?role=RESPONDER_ADMIN
```

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Ada",
      "lastName": "Okeke",
      "email": "ada@ires.example",
      "role": "AGENT",
      "status": "active",
      "avatar": { "publicId": "…", "url": "https://…" },
      "lastLogin": null,
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "total": 42,
  "limit": 10,
  "page": 1,
  "totalPages": 5,
  "nextPage": 2
}
```

> **Note for FE:** List is **`SUPER_ADMIN` only**. Agent Admin / Responder Admin UIs cannot call `GET /users` today — they can still create, get-by-id, update, activate/deactivate within their role scope. If those admins need a directory table, either use Super Admin for listing or ask backend to open list with role scoping.

---

## Get one user

```http
GET /api/v1/users/:id
```

Roles: `SUPER_ADMIN` | `AGENT_ADMIN` | `RESPONDER_ADMIN`

```json
{
  "message": "User fetched successfully",
  "data": { /* user object */ }
}
```

---

## Create agent / responder (+ optional avatar)

```http
POST /api/v1/users
Authorization: Bearer <staff-jwt>
Content-Type: multipart/form-data
```

### Form fields

| Field | Required | Notes |
|---|---|---|
| `firstName` | Yes | min length 2 |
| `lastName` | Yes | min length 2 |
| `email` | Yes | Unique |
| `role` | Yes* | See allowed roles below |
| `avatar` | No | Image file |

\*Send `role` as a form string, e.g. `AGENT`.

**Do not send `password`.** Backend generates one and emails it via welcome email.

### Allowed `role` by actor

| Actor | Allowed `role` values |
|---|---|
| `SUPER_ADMIN` | Any except `SUPER_ADMIN` |
| `AGENT_ADMIN` | `AGENT` only |
| `RESPONDER_ADMIN` | `RESPONDER_TIER_1`, `RESPONDER_TIER_2` |

### Example — create agent

```http
POST /users
Content-Type: multipart/form-data

firstName=Ada
lastName=Okeke
email=ada@ires.example
role=AGENT
avatar=<file>
```

### Example — create responder (tier 1)

```http
POST /users
Content-Type: multipart/form-data

firstName=Chi
lastName=Nwosu
email=chi@ires.example
role=RESPONDER_TIER_1
avatar=<file>
```

### Response

```json
{
  "message": "User created successfully"
}
```

Create does **not** return the full user body. After create, Super Admin can list/search by email; or navigate using a follow-up get if you have the id from another flow.

Errors:

| Status | When |
|---|---|
| `409` | Email already exists |
| `403` | Role outside your scope / trying to create `SUPER_ADMIN` |
| `400` | Validation (name, email, role enum) |

---

## Update user (+ optional new avatar)

```http
PUT /api/v1/users/:id
Authorization: Bearer <staff-jwt>
Content-Type: multipart/form-data
```

### Form fields (all optional — send what changed)

| Field | Notes |
|---|---|
| `firstName` | |
| `lastName` | |
| `email` | |
| `role` | Same scope rules as create |
| `avatar` | New image file — replaces previous (Cloudinary overwrite by `publicId`) |

Omit `avatar` to keep the existing image.

### Response

```json
{
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "firstName": "Ada",
    "lastName": "Okeke",
    "email": "ada@ires.example",
    "role": "AGENT",
    "status": "active",
    "avatar": { "publicId": "…", "url": "https://…" },
    "lastLogin": "…",
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

Use `data.avatar.url` to refresh the UI thumbnail after upload.

---

## Own profile (any staff user)

### Get

```http
GET /api/v1/users/profile
```

```json
{
  "message": "User profile fetched successfully",
  "data": { /* user object */ }
}
```

### Update (+ optional avatar)

```http
PUT /api/v1/users/profile
Content-Type: multipart/form-data
```

| Field | Notes |
|---|---|
| `firstName` | Optional |
| `lastName` | Optional |
| `avatar` | Optional file |

Role / email are **not** updated via profile (controller only passes first/last name + avatar).

```json
{
  "message": "User profile updated successfully",
  "data": { /* user object with new avatar if uploaded */ }
}
```

---

## Activate / deactivate

```http
PATCH /api/v1/users/:userId/activate
PATCH /api/v1/users/:userId/deactivate
```

No body. Same role scope as update.

```json
{
  "message": "User activated successfully",
  "data": { /* user object, status: "active" */ }
}
```

```json
{
  "message": "User deactivated successfully",
  "data": { /* user object, status: "inactive" */ }
}
```

---

## Delete

```http
DELETE /api/v1/users/:id
```

```json
{
  "message": "User deleted successfully"
}
```

Same role scope as update.

---

## Admin UI mapping (suggested)

### Agents screen (`AGENT_ADMIN` or Super Admin)

| UI | API |
|---|---|
| List agents | `GET /users?role=AGENT&page=&limit=` (**Super Admin**) |
| Create agent | `POST /users` + `role=AGENT` + optional `avatar` |
| Edit agent / change photo | `PUT /users/:id` multipart |
| Activate / deactivate | `PATCH …/activate` / `…/deactivate` |
| Delete | `DELETE /users/:id` |

### Responders screen (`RESPONDER_ADMIN` or Super Admin)

| UI | API |
|---|---|
| List T1 / T2 | `GET /users?role=RESPONDER_TIER_1` or `RESPONDER_TIER_2` (**Super Admin**) |
| Create | `POST /users` + `role=RESPONDER_TIER_1` \| `RESPONDER_TIER_2` + optional `avatar` |
| Edit / photo | `PUT /users/:id` |
| Activate / deactivate / delete | Same as agents |

### Ticket assign picker

Load responders for assign / reassign:

```
GET /users?role=RESPONDER_TIER_1&limit=50
GET /users?role=RESPONDER_TIER_2&limit=50
```

(Super Admin list; if Responder Admin needs this, backend list scope must be extended.)

Show `avatar.url` + `firstName` `lastName` in the picker; submit `assignedResponderId` = `id`.

---

## FE acceptance checklist

- [ ] Create / update / profile use **`multipart/form-data`**, field name **`avatar`**
- [ ] Display `user.avatar?.url` (fallback initials if missing)
- [ ] After update, replace thumbnail from response `data.avatar.url`
- [ ] Agent Admin UI: force / only allow `role=AGENT`
- [ ] Responder Admin UI: only `RESPONDER_TIER_1` / `RESPONDER_TIER_2`
- [ ] Never send or show password on create — user gets welcome email
- [ ] Status badges for `active` / `inactive`
- [ ] Super Admin user directory: pagination via `page` / `limit` / `totalPages` / `nextPage`
- [ ] Handle `403` scope errors and `409` duplicate email

---

## Quick reference — multipart payloads

**Create agent**

```
POST /api/v1/users
firstName, lastName, email, role=AGENT, avatar?
→ { "message": "User created successfully" }
```

**Create responder**

```
POST /api/v1/users
firstName, lastName, email, role=RESPONDER_TIER_1|RESPONDER_TIER_2, avatar?
→ { "message": "User created successfully" }
```

**Update user / avatar**

```
PUT /api/v1/users/:id
firstName?, lastName?, email?, role?, avatar?
→ { "message": "User updated successfully", "data": { …user, avatar } }
```

**Update own avatar**

```
PUT /api/v1/users/profile
firstName?, lastName?, avatar?
→ { "message": "User profile updated successfully", "data": { … } }
```
