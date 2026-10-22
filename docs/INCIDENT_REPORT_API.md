# Incident report API

Public endpoint for the `/report` page. The backend emails each report to the support inbox. The recipient address comes from the environment. Do not hardcode `support@iresorg.com` or any other address in code.

Base URL: `{API}/api/v1`  
Auth: none. This route is public.

The page should call this route instead of flattening the form into `POST /contact`.

---

## Environment

| Variable | Required | Example | Use |
|---|---|---|---|
| `SUPPORT_EMAIL` | Yes | `support@iresorg.com` | `To` address for every incident report |

Read it at startup. If `SUPPORT_EMAIL` is missing or not a valid email, fail startup (or refuse this route) and log that the variable is unset. Do not fall back to a hardcoded address.

Send mail with the mailer the API already uses for other email. This route only chooses the recipient.

---

## Submit a report

```http
POST /api/v1/incident-reports
Content-Type: application/json
```

### Body

| Field | Type | Required | Values |
|---|---|---|---|
| `severity` | string | Yes | `Critical` \| `High` \| `Medium` \| `Low` |
| `incidentType` | string | Yes | Free text. Not an enum |
| `ongoing` | string | Yes | `Yes` \| `No` \| `Not sure` |
| `name` | string | Yes | Reporter name |
| `organization` | string | Yes | Organization |
| `phone` | string | Yes | Number the handler should call |
| `email` | string | Yes | Reporter email. Use as `Reply-To` |
| `detectedAt` | string | No | `datetime-local` value from the browser, for example `2026-10-21T14:30` |
| `affectedSystems` | string | No | Free text |
| `description` | string | Yes | What happened |
| `confirmed` | boolean | Yes | Must be `true` |

`incidentType` is any non-empty string (max 200 characters). The form may still offer labels such as Ransomware or Phishing, but the API does not restrict the value to that list.

`severity` must be `Critical`, `High`, `Medium`, or `Low`. `ongoing` must be `Yes`, `No`, or `Not sure`.

Trim strings. Reject empty required fields and any value outside those two lists with `400`.

```json
{
  "severity": "Critical",
  "incidentType": "Ransomware",
  "ongoing": "Yes",
  "name": "Ada Okonkwo",
  "organization": "Northwind Ltd",
  "phone": "08031234567",
  "email": "ada@northwind.example",
  "detectedAt": "2026-10-21T14:30",
  "affectedSystems": "Email and file server",
  "description": "Staff cannot open shared files. A ransom note is on the desktop.",
  "confirmed": true
}
```

### Email the backend sends

| Header | Value |
|---|---|
| To | `SUPPORT_EMAIL` |
| Reply-To | Reporter `email` |
| Subject | `Incident report — {severity} — {incidentType}` |

The support message is an HTML email using the iRES template. It includes severity, incident type, whether it is ongoing, name, organization, phone, email, and the description. Detected time and affected systems are included only when the visitor filled them in.

| Header | Value |
|---|---|
| To | `SUPPORT_EMAIL` |
| Reply-To | Reporter `email` |
| Subject | `Incident report — {severity} — {incidentType}` |

The reporter also receives an HTML confirmation at the email they submitted.

| Header | Value |
|---|---|
| To | Reporter `email` |
| Subject | `We received your incident report — {incidentReference}` |

Send the email before returning success. If sending the support email fails, return `500` so the page can tell the visitor to call the hotline. Do not respond with success when that email was not sent.

The support email uses the iRES HTML template (severity, contact details, and the description). `Reply-To` is the reporter email.

A second email, also from the iRES template, is sent to the reporter address: subject `We received your incident report`. If that confirmation fails after support already received the report, the API still returns success.

### Success

`201 Created`

```json
{
  "message": "Incident report received",
  "incidentReference": "IR-20261022-A1B2C3"
}
```

### Errors

| Status | When |
|---|---|
| `400` | Missing field, invalid enum, `confirmed` is not `true`, or invalid reporter email |
| `429` | Too many reports from the same client. Suggested limit: 5 per hour per IP |
| `500` | `SUPPORT_EMAIL` is unset, or the mailer failed |

```json
{
  "message": "Could not send the report."
}
```

Validation errors can name the field:

```json
{
  "message": "severity must be one of Critical, High, Medium, Low"
}
```

---

## Notes for the frontend

- Path the client will call: `POST /incident-reports` (the axios base URL already ends in `/api/v1`).
- No `Authorization` header.
- The page keeps a honeypot field in the browser. A filled honeypot is dropped on the client and is not posted.
- Hotline numbers stay on the page. This API does not replace the phone call for an incident that has stopped operations.
