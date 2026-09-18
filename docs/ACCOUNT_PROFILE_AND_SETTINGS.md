# Account Profile & Settings — Frontend Guide

Customer portal **Profile** and **Settings** APIs (individual + organization).

Base URL: `{API}/api/v1`  
Auth: portal **account** JWT (`Authorization: Bearer <token>`, audience `portal`)

Related:

- Billing / plans → [`PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md`](./PUBLIC_AND_ACCOUNT_SUBSCRIPTIONS.md)
- Account tickets → [`PUBLIC_ACCOUNT_TICKETS.md`](./PUBLIC_ACCOUNT_TICKETS.md)

---

## Auth reminder

| | |
|---|---|
| Login | `POST /accounts/auth/login` → JWT |
| Header | `Authorization: Bearer <account-jwt>` |
| Guard | `AccountsAuthGuard` on all routes below (except forgot/reset) |

`role` on the account is `individual` or `organization`. Branch the Profile UI from `GET /accounts/auth/me` → `role`.

---

## Suggested UI map

```
Settings / Profile
├── Profile overview          ← GET me
├── Edit profile              ← PUT profile (fields depend on role)
│     ├── Individual form
│     └── Organization form
├── Change password           ← POST change-password
├── Forgot password (public)  ← POST forgot-password (logged-out)
└── Logout                    ← POST logout + discard token
```

There is **one** update endpoint for both account types: `PUT /accounts/auth/profile`. The backend picks individual vs organization from the logged-in account’s `role`.

---

## Get profile

```http
GET /api/v1/accounts/auth/me
Authorization: Bearer <account-jwt>
```

### Individual response

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "individual",
  "emailVerifiedAt": "2026-09-01T00:00:00.000Z",
  "lastLoginAt": "2026-09-18T08:00:00.000Z",
  "createdAt": "2026-08-01T00:00:00.000Z",
  "individualProfile": {
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+2348000000000",
    "profilePicture": {
      "publicId": "ires/…",
      "url": "https://res.cloudinary.com/…/…"
    }
  }
}
```

`profilePicture` may be `null` / missing. Display `individualProfile.profilePicture.url` when present.

### Organization response

```json
{
  "id": "uuid",
  "email": "billing@zeema.example",
  "role": "organization",
  "emailVerifiedAt": "2026-09-01T00:00:00.000Z",
  "lastLoginAt": "2026-09-18T08:00:00.000Z",
  "createdAt": "2026-08-01T00:00:00.000Z",
  "organizationProfile": {
    "organizationName": "Zeema Advisory Limited",
    "logoUrl": {
      "publicId": "ires/…",
      "url": "https://res.cloudinary.com/…/…"
    },
    "industryType": "Technology",
    "companySize": "51-200",
    "businessAddress": "123 Business St",
    "city": "Lagos",
    "state": "LA",
    "country": "Nigeria",
    "phoneNumber": "+2348000000000",
    "primaryContactFirstName": "Ada",
    "primaryContactLastName": "Okeke",
    "primaryContactJobTitle": "IT Manager",
    "primaryContactEmail": "ada@zeema.example",
    "primaryContactPhoneNumber": "+2348000000001"
  }
}
```

`logoUrl` may be `null` / missing. Display `organizationProfile.logoUrl.url`.

### Errors

| Status | When |
|---|---|
| `401` | Missing / invalid token |

---

## Update profile

```http
PUT /api/v1/accounts/auth/profile
Authorization: Bearer <account-jwt>
Content-Type: multipart/form-data
```

Send **only fields that change**. File field name is always **`profilePicture`** (individual photo **or** org logo).

Backend behavior:

| `role` | Handler | Image stored as |
|---|---|---|
| `individual` | Individual update | `individualProfile.profilePicture` `{ publicId, url }` |
| `organization` | Organization update | `organizationProfile.logoUrl` `{ publicId, url }` |

### Individual fields (form)

| Field | Required | Notes |
|---|---|---|
| `firstName` | no | |
| `lastName` | no | |
| `phoneNumber` | no | |
| `profilePicture` | no | Image file |

```ts
const form = new FormData();
form.append("firstName", "John");
form.append("lastName", "Doe");
form.append("phoneNumber", "+234…");
if (file) form.append("profilePicture", file);
```

### Organization fields (form)

| Field | Required | Notes |
|---|---|---|
| `organizationName` | no | |
| `industryType` | no | Free text |
| `companySize` | no | Must be one of enum below |
| `businessAddress` | no | |
| `city` | no | |
| `state` | no | |
| `country` | no | |
| `phoneNumber` | no | Org phone |
| `primaryContactFirstName` | no | |
| `primaryContactLastName` | no | |
| `primaryContactJobTitle` | no | |
| `primaryContactEmail` | no | |
| `primaryContactPhoneNumber` | no | |
| `profilePicture` | no | Treated as **logo** |

**`companySize` allowlist**

`1-10` · `11-50` · `51-200` · `200-500` · `500-1000` · `1000+`

```ts
const form = new FormData();
form.append("organizationName", "Zeema Advisory Limited");
form.append("companySize", "51-200");
form.append("city", "Lagos");
// …
if (logo) form.append("profilePicture", logo);
```

### Success

```json
{
  "message": "Profile updated successfully"
}
```

Update does **not** return the full profile — call `GET /accounts/auth/me` again to refresh the UI (and new image URL).

### Errors

| Status | When |
|---|---|
| `400` | Wrong role / validation (e.g. invalid `companySize`) |
| `401` | Unauthorized |

**Not updatable here:** `email`, `role`. Email change is not supported on this endpoint.

---

## Change password (logged in)

```http
POST /api/v1/accounts/auth/change-password
Authorization: Bearer <account-jwt>
Content-Type: application/json
```

```json
{
  "currentPassword": "oldPass123",
  "newPassword": "newSecurePass123"
}
```

| Field | Rules |
|---|---|
| `currentPassword` | Required |
| `newPassword` | Required, min length **6** |

### Success

```json
{
  "message": "Password changed successfully"
}
```

### Errors

| Status | Message |
|---|---|
| `401` | `Current password is incorrect` |
| `400` | Validation (e.g. new password too short) |

UI: current password + new + confirm (confirm is FE-only). On success, optional “stay logged in” or force re-login.

---

## Forgot / reset password (logged out)

Use on Settings → “Forgot password” or the public auth screens.

### Request reset email

```http
POST /api/v1/accounts/auth/forgot-password
Content-Type: application/json
```

```json
{ "email": "user@example.com" }
```

```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

Always the same message (no email enumeration).

### Reset with token

```http
POST /api/v1/accounts/auth/reset-password
Content-Type: application/json
```

```json
{
  "token": "<from-email-link>",
  "newPassword": "newSecurePass123"
}
```

```json
{
  "message": "Password has been reset successfully"
}
```

Token expires in **1 hour**.

---

## Logout

```http
POST /api/v1/accounts/auth/logout
Authorization: Bearer <account-jwt>
```

```json
{
  "message": "Logged out successfully"
}
```

JWT is stateless — discard the token client-side after this call.

---

## FE acceptance checklist

- [ ] Load profile via `GET /accounts/auth/me` on Profile / Settings open
- [ ] Branch forms on `role === "individual"` vs `"organization"`
- [ ] Show avatar from `profilePicture.url` or logo from `logoUrl.url`
- [ ] Edit uses **`multipart/form-data`**, field name **`profilePicture`**
- [ ] Org `companySize` select uses only the allowlisted values
- [ ] After update, re-fetch `me` (response is message-only)
- [ ] Change password: current + new (min 6); handle incorrect current password
- [ ] Forgot/reset available when logged out
- [ ] Logout clears stored JWT
- [ ] Do not offer email edit unless a future API adds it

---

## Quick reference

| Action | Method | Path | Auth | Body |
|---|---|---|---|---|
| Get profile | `GET` | `/accounts/auth/me` | Account JWT | — |
| Update profile | `PUT` | `/accounts/auth/profile` | Account JWT | `multipart/form-data` |
| Change password | `POST` | `/accounts/auth/change-password` | Account JWT | JSON |
| Forgot password | `POST` | `/accounts/auth/forgot-password` | None | JSON `{ email }` |
| Reset password | `POST` | `/accounts/auth/reset-password` | None | JSON `{ token, newPassword }` |
| Logout | `POST` | `/accounts/auth/logout` | Account JWT | — |
