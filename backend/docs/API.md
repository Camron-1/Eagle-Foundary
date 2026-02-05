# Eagle Foundry — Backend API Reference

This document describes all HTTP endpoints, request/response shapes, and behavior for the Eagle Foundry backend.

---

## Table of contents

1. [Conventions](#conventions)
2. [Authentication](#authentication)
3. [Response format](#response-format)
4. [Pagination](#pagination)
5. [Auth](#auth)
6. [Students](#students)
7. [Organizations](#organizations)
8. [Startups](#startups)
9. [Join requests](#join-requests)
10. [Opportunities](#opportunities)
11. [Applications](#applications)
12. [Messaging](#messaging)
13. [Notifications](#notifications)
14. [Files](#files)
15. [Search](#search)
16. [Admin](#admin)
17. [Moderation (Reports)](#moderation-reports)
18. [Error codes](#error-codes)

---

## Conventions

- **Base URL:** `http://localhost:3000` (or your deployment host)
- **API prefix:** `/api`
- **Content-Type:** `application/json` for request/response bodies
- **Auth:** Protected routes use `Authorization: Bearer <accessToken>`
- **IDs:** UUIDs for all resources (`id`, `orgId`, `startupId`, etc.)

---

## Authentication

Protected routes require a valid JWT access token:

```http
Authorization: Bearer <accessToken>
```

- Obtain tokens via `POST /api/auth/student/signup` or `POST /api/auth/company/signup` (then verify OTP), then `POST /api/auth/login`.
- Use `POST /api/auth/refresh` with a valid refresh token to get a new access token.
- Access tokens are short-lived (default 15m); refresh tokens longer (default 7d).

**Roles:** `STUDENT`, `COMPANY_ADMIN`, `COMPANY_MEMBER`, `UNIVERSITY_ADMIN`. Some routes are restricted by role (e.g. admin-only, student-only, company-only).

---

## Response format

**Success (single resource):**

```json
{
  "success": true,
  "data": { ... }
}
```

**Success (paginated):**

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "pagination": {
      "cursor": "optional-current-cursor",
      "nextCursor": "next-cursor-or-null",
      "hasMore": true,
      "total": 100
    }
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

---

## Pagination

List endpoints use **cursor-based** pagination:

| Query param | Type | Description |
|-------------|------|-------------|
| `cursor` | string | Opaque cursor from previous response (`meta.pagination.nextCursor`) |
| `limit` | number (string) | Page size (defaults vary, usually 20; max often 50–100) |

Response includes `meta.pagination.nextCursor` and `hasMore`. Omit `cursor` for the first page.

---

## Auth

Base path: **`/api/auth`**

### POST `/api/auth/student/signup`

Register a new student. Email must match `STUDENT_EMAIL_DOMAIN` (e.g. `@ashland.edu`). Sends OTP; account stays `PENDING_OTP` until OTP is verified.

**Rate limit:** Auth rate limiter.

**Request body:**

```json
{
  "email": "student@ashland.edu",
  "password": "securePassword123!",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| email | string | yes | Valid email, allowed student domain |
| password | string | yes | Min length per app policy |
| firstName | string | yes | 1–100 chars |
| lastName | string | yes | 1–100 chars |

**Response:** `201` with `data: { user, accessToken, refreshToken, expiresIn }` (or similar; tokens for convenience; may require verify OTP first depending on implementation).

---

### POST `/api/auth/company/signup`

Register a new company (org) admin. Email must not use blocked domains (e.g. gmail, yahoo). Sends OTP; org and user stay `PENDING_OTP` until verified.

**Request body:**

```json
{
  "email": "admin@company.com",
  "password": "securePassword123!",
  "companyName": "Acme Inc",
  "firstName": "John",
  "lastName": "Admin"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| email | string | yes | Valid email, not blocked domain |
| password | string | yes | Min length |
| companyName | string | yes | 1–200 chars |
| firstName | string | yes | 1–100 chars |
| lastName | string | yes | 1–100 chars |

**Response:** `201` with user/org and tokens (or next step: verify OTP).

---

### POST `/api/auth/verify-otp`

Verify email OTP after signup (or for password reset). Activates account or completes reset flow.

**Request body:**

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

| Field | Type | Required |
|-------|------|----------|
| email | string | yes |
| code | string | yes | 6-digit OTP |

**Response:** `200` with tokens and user (for signup verify); or success for password reset.

---

### POST `/api/auth/resend-otp`

Resend OTP to email. Subject to cooldown and per-hour limits.

**Request body:**

```json
{
  "email": "user@example.com"
}
```

**Response:** `200` or `204` on success.

---

### POST `/api/auth/login`

Authenticate and get access + refresh tokens. User must be `ACTIVE` (OTP verified).

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:** `200` with `data: { user, accessToken, refreshToken, expiresIn }`.

**Errors:** `401` for invalid credentials; `403` if account pending OTP or suspended.

---

### POST `/api/auth/refresh`

Issue new access (and possibly refresh) token using a valid refresh token.

**Request body:**

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:** `200` with new tokens.

---

### POST `/api/auth/logout`

Invalidate the given refresh token.

**Request body:** Same as refresh (`refreshToken`).

**Response:** `204` or `200`.

---

### POST `/api/auth/forgot-password`

Send password-reset OTP to email.

**Request body:**

```json
{
  "email": "user@example.com"
}
```

**Response:** `200` or `204` (do not reveal whether email exists).

---

### POST `/api/auth/reset-password`

Reset password using OTP from forgot-password flow.

**Request body:**

```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newSecurePassword123!"
}
```

**Response:** `200` or `204` on success.

---

### GET `/api/auth/me`

Return current authenticated user (and profile/org if applicable). Requires valid access token and active user.

**Response:** `200` with `data: user` (id, email, role, status, studentProfile or org, etc.).

---

## Students

Base path: **`/api/students`**  
All routes require authentication and active user.

### GET `/api/students/me`

Get current user’s student profile. **Role:** STUDENT.

**Response:** `200` with student profile (and related user fields).

---

### PUT `/api/students/me`

Update current student profile. **Role:** STUDENT.

**Request body (all optional):**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "major": "CS",
  "gradYear": 2026,
  "bio": "Short bio",
  "skills": ["JavaScript", "React"],
  "linkedinUrl": "https://linkedin.com/in/...",
  "githubUrl": "https://github.com/..."
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| firstName, lastName | string | 1–100 |
| major | string | max 200 |
| gradYear | number | 2000–2100 |
| bio | string | max 2000 |
| skills | string[] | max 20 items, each max 50 chars |
| linkedinUrl, githubUrl | string (url) | optional |

**Response:** `200` with updated profile.

---

### GET `/api/students/me/portfolio`

List portfolio items for current student. **Role:** STUDENT.

**Response:** `200` with array of portfolio items.

---

### POST `/api/students/me/portfolio`

Create a portfolio item. **Role:** STUDENT.

**Request body:**

```json
{
  "title": "Project Alpha",
  "description": "Description",
  "url": "https://...",
  "imageUrl": "https://..."
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | yes | 1–200 |
| description | string | no | max 2000 |
| url | string (url) | no | |
| imageUrl | string (url) | no | |

**Response:** `201` with created portfolio item.

---

### PUT `/api/students/me/portfolio/:id`

Update a portfolio item. **Role:** STUDENT. `id` = UUID.

**Request body:** Same shape as create (all fields optional).

**Response:** `200` with updated item.

---

### DELETE `/api/students/me/portfolio/:id`

Delete a portfolio item. **Role:** STUDENT.

**Response:** `204` or `200`.

---

### POST `/api/students/me/resume/presign`

Get presigned URL for resume upload (PDF only, max 10MB). **Role:** STUDENT.

**Request body:**

```json
{
  "filename": "resume.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 102400
}
```

**Response:** `200` with `data: { uploadUrl, key, expiresAt }` (or similar). Client uploads to `uploadUrl`, then may update profile with resulting URL if applicable.

---

### GET `/api/students/:id/public`

Get a student’s public profile. **Roles:** COMPANY_ADMIN, COMPANY_MEMBER, UNIVERSITY_ADMIN only.

**Params:** `id` = student (profile/user) UUID.

**Response:** `200` with public profile data.

---

## Organizations

Base path: **`/api/orgs`**

### GET `/api/orgs`

List organizations. Public; optional auth. Query params may include pagination (`cursor`, `limit`) and `search`.

**Response:** `200` with paginated list of orgs.

---

### GET `/api/orgs/:orgId`

Get organization by ID. Public.

**Params:** `orgId` = UUID.

**Response:** `200` with org.

---

### GET `/api/orgs/me`

Get current user’s organization. **Roles:** COMPANY_ADMIN, COMPANY_MEMBER.

**Response:** `200` with org (and members if applicable).

---

### PUT `/api/orgs/me`

Update current user’s organization. **Roles:** COMPANY_ADMIN, COMPANY_MEMBER.

**Request body (all optional):**

```json
{
  "name": "Acme Inc",
  "description": "Description",
  "website": "https://acme.com",
  "logoUrl": "https://..."
}
```

**Response:** `200` with updated org.

---

### GET `/api/orgs/me/members`

List members of current org. **Role:** COMPANY_ADMIN or COMPANY_MEMBER.

**Response:** `200` with list of members (user + role).

---

### POST `/api/orgs/me/members`

Add a member to current org by email. **Role:** COMPANY_ADMIN.

**Request body:**

```json
{
  "email": "member@company.com",
  "role": "COMPANY_ADMIN"
}
```

`role`: `COMPANY_ADMIN` | `COMPANY_MEMBER`.

**Response:** `201` with added member or invite info.

---

### DELETE `/api/orgs/me/members/:memberId`

Remove a member from current org. **Role:** COMPANY_ADMIN.

**Params:** `memberId` = user UUID.

**Response:** `204` or `200`.

---

## Startups

Base path: **`/api/startups`**  
All routes require authentication and active user.

### POST `/api/startups`

Create a startup. **Role:** STUDENT.

**Request body:**

```json
{
  "name": "My Startup",
  "tagline": "One line",
  "description": "Long description",
  "stage": "idea",
  "tags": ["tech", "edtech"],
  "logoUrl": "https://..."
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | 1–200 |
| tagline | string | no | max 280 |
| description | string | no | max 5000 |
| stage | string | no | max 100 |
| tags | string[] | no | max 10, each max 50 |
| logoUrl | string (url) | no | |

**Response:** `201` with created startup.

---

### GET `/api/startups`

List startups (for current user or filtered). **Role:** STUDENT. Query: `cursor`, `limit`, `status`, `tags`, `stage`, `search`.

**Response:** `200` with paginated startups.

---

### GET `/api/startups/:id`

Get startup by ID. Auth required; ownership may be enforced for sensitive fields.

**Params:** `id` = UUID.

**Response:** `200` with startup.

---

### PUT `/api/startups/:id`

Update startup. **Role:** STUDENT; must be member (e.g. founder). Only in DRAFT or NEEDS_CHANGES.

**Request body:** Same shape as create (all optional).

**Response:** `200` with updated startup.

---

### POST `/api/startups/:id/submit`

Submit startup for admin review. **Role:** STUDENT; must be member. Status becomes SUBMITTED.

**Response:** `200` with updated startup.

---

### POST `/api/startups/:id/archive`

Archive startup. **Role:** STUDENT; must be member.

**Response:** `200` with updated startup (status ARCHIVED).

---

### GET `/api/startups/:id/team`

Get team members for a startup. Auth required.

**Response:** `200` with list of members (profile, role, joinedAt).

---

### POST `/api/startups/:id/join-requests`

Create a join request for the startup. **Role:** STUDENT. Body: `{ "message": "optional message" }` (max 500 chars).

**Response:** `201` with created join request.

---

### GET `/api/startups/:id/join-requests`

List join requests for the startup. **Role:** STUDENT (founder/member). Query: `cursor`, `limit`, `status`.

**Response:** `200` with paginated join requests.

---

## Join requests

Base path: **`/api/join-requests`**  
All routes require authentication and active user.

### GET `/api/join-requests/me`

List join requests for current student. **Role:** STUDENT.

**Response:** `200` with paginated join requests.

---

### POST `/api/join-requests/:id/cancel`

Cancel a pending join request. **Role:** STUDENT; must be requester.

**Response:** `200` with updated request (status CANCELLED).

---

### PATCH `/api/join-requests/:id`

Accept or reject a join request. **Role:** Startup founder/member (or same-student check). Body: `{ "status": "ACCEPTED" | "REJECTED" }`.

**Response:** `200` with updated join request. Accepting may create a message thread.

---

## Opportunities

Base path: **`/api/opportunities`**

### GET `/api/opportunities`

List opportunities. Public. Query: `cursor`, `limit`, `status`, `budgetType`, `tags`, `search`.

**Response:** `200` with paginated opportunities (typically only PUBLISHED in public listing).

---

### GET `/api/opportunities/:id`

Get opportunity by ID. Public.

**Response:** `200` with opportunity.

---

### POST `/api/opportunities`

Create opportunity for current org. **Role:** COMPANY_ADMIN.

**Request body:**

```json
{
  "title": "Summer Internship",
  "description": "Description",
  "requirements": "Requirements",
  "budgetType": "paid",
  "budgetRange": "$15-20/hr",
  "tags": ["internship", "frontend"]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | yes | 1–200 |
| description | string | no | max 5000 |
| requirements | string | no | max 2000 |
| budgetType | string | no | `paid` \| `unpaid` \| `equity` |
| budgetRange | string | no | max 100 |
| tags | string[] | no | max 10, each max 50 |

**Response:** `201` with created opportunity (status DRAFT).

---

### PATCH `/api/opportunities/:id`

Update opportunity. **Role:** COMPANY_ADMIN; must be org’s opportunity.

**Request body:** Same shape as create (all optional).

**Response:** `200` with updated opportunity.

---

### POST `/api/opportunities/:id/publish`

Publish opportunity. **Role:** COMPANY_ADMIN.

**Response:** `200` with updated opportunity (status PUBLISHED, publishedAt set).

---

### POST `/api/opportunities/:id/close`

Close opportunity. **Role:** COMPANY_ADMIN.

**Response:** `200` with updated opportunity (status CLOSED, closedAt set).

---

### GET `/api/opportunities/org/me`

List opportunities for current user’s org. **Role:** COMPANY_ADMIN.

**Response:** `200` with paginated opportunities.

---

### POST `/api/opportunities/:id/applications`

Create an application to the opportunity. **Role:** STUDENT. One application per student per opportunity.

**Request body:**

```json
{
  "coverLetter": "Optional cover letter",
  "resumeUrl": "https://..."
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| coverLetter | string | max 3000 |
| resumeUrl | string (url) | optional |

**Response:** `201` with created application.

---

### GET `/api/opportunities/:id/applications`

List applications for the opportunity. **Role:** COMPANY_MEMBER (org must own opportunity). Query: `cursor`, `limit`, `status`.

**Response:** `200` with paginated applications.

---

## Applications

Base path: **`/api/applications`**  
All routes require authentication and active user.

### GET `/api/applications/me`

List applications for current student. **Role:** STUDENT. Query: `cursor`, `limit`, `status`.

**Response:** `200` with paginated applications.

---

### POST `/api/applications/:id/withdraw`

Withdraw application. **Role:** STUDENT; must be applicant. Status becomes WITHDRAWN.

**Response:** `200` with updated application.

---

### GET `/api/applications/:id`

Get application by ID. **Role:** COMPANY_MEMBER (org must own the opportunity).

**Response:** `200` with application (and status history if applicable).

---

### PATCH `/api/applications/:id/status`

Update application status (shortlist, interview, select, reject). **Role:** COMPANY_ADMIN. Body: `{ "status": "SHORTLISTED" | "INTERVIEW" | "SELECTED" | "REJECTED", "note": "optional" }` (note max 500).

**Response:** `200` with updated application.

---

## Messaging

Base path: **`/api/messages`**  
All routes require authentication and active user.

### GET `/api/messages/threads`

List message threads for current user. Query: `cursor`, `limit`.

**Response:** `200` with paginated threads (with last message or summary).

---

### GET `/api/messages/threads/:id`

Get thread by ID. Caller must be participant.

**Response:** `200` with thread.

---

### GET `/api/messages/threads/:id/messages`

List messages in thread. Query: `cursor`, `limit`, `before` (for older messages). Caller must be participant.

**Response:** `200` with paginated messages.

---

### POST `/api/messages/threads/:id/messages`

Send a message in thread. Body: `{ "content": "message text" }` (1–5000 chars).

**Response:** `201` with created message.

---

## Notifications

Base path: **`/api/notifications`**  
All routes require authentication and active user.

### GET `/api/notifications`

List notifications for current user. Query: `cursor`, `limit`, `unreadOnly` (boolean string).

**Response:** `200` with paginated notifications.

---

### GET `/api/notifications/unread-count`

Get count of unread notifications.

**Response:** `200` with `data: { count: number }` (or similar).

---

### POST `/api/notifications/read-all`

Mark all notifications as read.

**Response:** `200` or `204`.

---

### POST `/api/notifications/:id/read`

Mark one notification as read.

**Response:** `200` or `204`.

---

### DELETE `/api/notifications/:id`

Delete a notification.

**Response:** `204` or `200`.

---

## Files

Base path: **`/api/files`**  
All routes require authentication and active user.

### POST `/api/files/presign`

Get presigned URL for upload. Client uploads file to the returned URL, then calls confirm with the key.

**Request body:**

```json
{
  "filename": "image.png",
  "mimeType": "image/png",
  "sizeBytes": 102400,
  "context": "startup_logo",
  "contextId": "uuid-of-startup"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| filename | string | yes | 1–255 |
| mimeType | string | yes | One of allowed types (e.g. image/*, application/pdf) |
| sizeBytes | number | yes | 1–50MB |
| context | string | yes | `startup_logo` \| `startup_media` \| `resume` \| `portfolio` \| `opportunity` \| `org_logo` \| `application` \| `message` |
| contextId | string (UUID) | yes | |

**Response:** `200` with `data: { uploadUrl, key, expiresAt }`.

---

### POST `/api/files/confirm`

Confirm that upload to S3 is done; creates or links File record.

**Request body:** `{ "key": "s3-key-from-presign" }`.

**Response:** `200` or `201` with file record (id, download URL or key, etc.).

---

### GET `/api/files/:id/download`

Get a time-limited download URL for the file. Caller must have access (owner or context permission).

**Response:** `200` with `data: { url, expiresAt }`.

---

### DELETE `/api/files/:id`

Delete file record and optionally S3 object. Caller must have permission.

**Response:** `204` or `200`.

---

## Search

Base path: **`/api/search`**  
Requires authentication and active user.

### GET `/api/search`

Global search across entities. Query params:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| q | string | yes | Search query, 1–200 chars |
| type | string | no | `all` \| `startups` \| `opportunities` \| `students` \| `orgs` (default `all`) |
| limit | number (string) | no | 1–50, default 10 |

**Response:** `200` with `data` containing hits by type (e.g. `startups`, `opportunities`, `students`, `orgs`), each an array of matching records.

---

## Admin

Base path: **`/api/admin`**  
All routes require authentication, active user, and **UNIVERSITY_ADMIN** role.

### GET `/api/admin/dashboard`

Dashboard stats (counts of users, orgs, startups by status, pending reports, etc.).

**Response:** `200` with `data: { ...stats }`.

---

### GET `/api/admin/startups/pending`

List startups pending review (SUBMITTED or NEEDS_CHANGES). Query: `cursor`, `limit`.

**Response:** `200` with paginated startups.

---

### POST `/api/admin/startups/:id/review`

Review a startup: approve, reject, or request changes.

**Request body:**

```json
{
  "action": "APPROVE",
  "feedback": "Optional feedback for REJECT or REQUEST_CHANGES"
}
```

`action`: `APPROVE` | `REJECT` | `REQUEST_CHANGES`. `feedback` max 2000 chars, optional for APPROVE.

**Response:** `200` with updated startup.

---

### GET `/api/admin/users`

List users. Query: `cursor`, `limit`, `status`.

**Response:** `200` with paginated users.

---

### PATCH `/api/admin/users/:id/status`

Update user status (active/suspended). Body: `{ "status": "ACTIVE" | "SUSPENDED", "reason": "optional" }` (reason max 500).

**Response:** `200` with updated user.

---

### GET `/api/admin/orgs`

List organizations. Query: `cursor`, `limit`, `status`.

**Response:** `200` with paginated orgs.

---

### PATCH `/api/admin/orgs/:id/status`

Update org status. Body: `{ "status": "ACTIVE" | "SUSPENDED", "reason": "optional" }`.

**Response:** `200` with updated org.

---

### GET `/api/admin/audit-logs`

List audit logs. Query: `cursor`, `limit`, filters (e.g. userId, action).

**Response:** `200` with paginated audit log entries.

---

## Moderation (Reports)

Base path: **`/api/reports`**  
Create and list own reports: any authenticated user. Pending list and resolve: **UNIVERSITY_ADMIN** only.

### POST `/api/reports`

Create a report. Body: `{ "reporterReason": "reason", "targetType": "USER" | "ORG" | "STARTUP" | "OPPORTUNITY" | "MESSAGE", "targetId": "uuid" }`. `reporterReason` 1–1000 chars.

**Response:** `201` with report.

---

### GET `/api/reports/me`

List reports created by current user.

**Response:** `200` with paginated reports.

---

### GET `/api/reports/pending`

List pending reports. **Role:** UNIVERSITY_ADMIN.

**Response:** `200` with paginated reports.

---

### POST `/api/reports/:id/resolve`

Resolve a report. **Role:** UNIVERSITY_ADMIN. Body: `{ "resolution": "DISMISSED" | "WARNING" | "CONTENT_REMOVED" | "USER_SUSPENDED" | "ORG_SUSPENDED", "adminNotes": "optional" }` (adminNotes max 1000).

**Response:** `200` with updated report.

---

## Error codes

Common `error.code` values returned by the API:

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed (see `error.details`) |
| INVALID_CREDENTIALS | 401 | Wrong email/password |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Valid token but not allowed (role/resource) |
| TOKEN_EXPIRED | 401 | Access or refresh token expired |
| TOKEN_INVALID | 401 | Malformed or invalid token |
| OTP_EXPIRED | 400 | OTP expired |
| OTP_INVALID | 400 | Wrong OTP |
| OTP_MAX_ATTEMPTS | 400 | Too many OTP attempts |
| OTP_COOLDOWN | 429 | Resend too soon |
| OTP_RATE_LIMIT | 429 | Too many OTP sends in window |
| INVALID_EMAIL_DOMAIN | 400 | Email domain not allowed (e.g. student signup) |
| BLOCKED_EMAIL_DOMAIN | 400 | Email domain blocked (e.g. company signup) |
| NOT_FOUND | 404 | Resource not found |
| ALREADY_EXISTS | 409 | e.g. duplicate application or join request |
| CONFLICT | 409 | Business rule conflict |
| ACCOUNT_PENDING | 403 | Account pending OTP verification |
| ACCOUNT_SUSPENDED | 403 | User suspended |
| ORG_SUSPENDED | 403 | Org suspended |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error (Sentry may capture) |

---

## Health

### GET `/health`

No auth. Returns service health and version.

**Response:** `200` with body e.g. `{ "status": "healthy", "timestamp": "...", "version": "1.0.0" }`.

---

## Summary of backend APIs

**Total: 77 HTTP endpoints** (76 under `/api` + 1 health check).

| Module | Mount path | Count | Notes |
|--------|------------|-------|--------|
| Auth | `/api/auth` | 10 | Signup, OTP, login, refresh, logout, password reset, `GET /me` |
| Students | `/api/students` | 8 | Profile, portfolio, resume presign, public profile |
| Orgs | `/api/orgs` | 7 | List, get, my org, update, members (list/add/remove) |
| Startups | `/api/startups` | 7 | CRUD, submit, archive, team (nested join-requests in `app.ts`) |
| Opportunities | `/api/opportunities` | 7 | List, get, CRUD, publish, close, org/me (nested applications in `app.ts`) |
| Admin | `/api/admin` | 8 | Dashboard, startup review, users, orgs, audit logs |
| Notifications | `/api/notifications` | 5 | List, unread count, read-all, mark read, delete |
| Join requests | `/api/join-requests` | 3 | My requests, cancel, accept/reject |
| Applications | `/api/applications` | 4 | My applications, withdraw, get, update status |
| Messaging | `/api/messages` | 4 | Threads list/get, messages list, send |
| Files | `/api/files` | 4 | Presign, confirm, download URL, delete |
| Moderation | `/api/reports` | 4 | Create, my reports, pending (admin), resolve |
| Search | `/api/search` | 1 | Global search |
| *(nested in app)* | — | 4 | `POST/GET /api/startups/:id/join-requests`, `POST/GET /api/opportunities/:id/applications` |
| Health | `/health` | 1 | Liveness/readiness (no `/api` prefix) |

*Last updated from backend route and validator definitions. For environment and deployment, see [deployment.md](./deployment.md).*
