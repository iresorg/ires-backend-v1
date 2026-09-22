# Auth token storage — frontend fix

Pentest finding **VULN-03**. The API still returns a JWT in the login JSON and still expects `Authorization: Bearer <token>`. The bug is how the browser apps store that token.

Applies to both frontends:

| App | Login | Token field | Logout |
|---|---|---|---|
| Customer portal | `POST /api/v1/accounts/auth/login` | `token` | `POST /api/v1/accounts/auth/logout` |
| Staff admin | `POST /api/v1/auth/login` | `data.accessToken` | `POST /api/v1/auth/logout` |

Base URL: `{API}/api/v1`

---

## What is wrong today

The portal stores the JWT in a cookie named `token` and copies the same value into IndexedDB.

Observed cookie:

- readable by `document.cookie` (`HttpOnly` is not set)
- `Secure` is not set
- no explicit `SameSite`
- the app reads that cookie and puts it on `Authorization: Bearer`

JavaScript sets that cookie, so the browser will never treat it as `HttpOnly`. Any script that runs on the site (XSS) can read the token from the cookie or from IndexedDB and call the API as the user.

Logout already deletes the local cookie and IndexedDB copy. That part is fine. The problem is where the token lives while the user is signed in.

---

## What to change

Keep one copy of the access token, in memory, for the signed-in tab.

1. On login, save `token` / `accessToken` in a module variable (or React context / Pinia / Zustand that is not persisted).
2. Attach that value as `Authorization: Bearer <token>` on API calls.
3. Do not write the JWT to `document.cookie`.
4. Do not write the JWT to IndexedDB, `localStorage`, or `sessionStorage`.
5. On logout, password change, and password reset success, clear the in-memory token and send the user to the login screen.
6. A full page refresh signs the user out. That is expected with memory-only storage. Do not “fix” the refresh by putting the JWT back in a cookie or IndexedDB.

Non-secret UI state (display name, role label, theme) can stay in normal storage. The JWT cannot.

### Portal login

```ts
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function authHeader(): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

// after POST /accounts/auth/login
setAccessToken(body.token);
```

### Staff login

```ts
// POST /auth/login → { message, data: { accessToken, user } }
setAccessToken(body.data.accessToken);
```

### Logout

Call logout while the token is still in memory, then drop it.

```ts
await fetch(`${API}/api/v1/accounts/auth/logout`, {
  method: "POST",
  headers: authHeader(),
});
setAccessToken(null);
// also delete any leftover cookie / IndexedDB key from the old implementation
```

Staff uses `POST /api/v1/auth/logout` with the staff Bearer token.

The server now invalidates previously issued JWTs on logout, password change, and password reset. A replay of the old token against `GET /accounts/auth/me` (or any other guarded route) returns **401**:

```json
{ "message": "Session has ended. Please login again." }
```

Treat that 401 like a logged-out user: clear the in-memory token and redirect to login. Do not retry with the same token.

Logout ends every session for that account, including other tabs and devices. Those tabs will get the same 401 on their next request.

### Remove the old stores

Search both apps and delete the writers and readers:

- `document.cookie` assignment for `token`
- `Cookies.set("token"` / `js-cookie` / similar
- IndexedDB databases or keys that store the JWT
- any auth bootstrap that does `document.cookie` → `Authorization`

After a user logs in under the new code, DevTools should show:

- Application → Cookies: no `token` cookie
- Application → IndexedDB: no JWT
- Console: `document.cookie` does not contain the JWT

---

## What not to do

Do not set `HttpOnly` or `Secure` from frontend JavaScript. The browser ignores `HttpOnly` on cookies created by script, which is why the current cookie stays readable.

Do not keep the Bearer header and also keep a JS-readable cookie “for convenience.” One memory copy is the fix that matches the current API.

A real `HttpOnly` + `Secure` + `SameSite` cookie would mean the API sets the cookie and the browser sends it automatically. That removes `Authorization: Bearer` from the frontend and needs a separate backend change. It is not required for this fix.
