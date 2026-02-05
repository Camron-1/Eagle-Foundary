# Eagle Foundry

A university-verified platform for students to launch startup projects, join teams, and apply for real company opportunities — with full administrative oversight.

---

## Overview

Eagle Foundry connects **students**, **companies**, and **university administrators** in one ecosystem:

- **Students** — Create and submit startups for review, build portfolios, join teams, and apply to company opportunities.
- **Companies** — Register organizations, post opportunities (internships, projects), and manage applications.
- **University admins** — Review and approve startups, manage users and organizations, and moderate content.

The backend is a production-ready **Node.js/Express** API with **PostgreSQL**, **Prisma**, **JWT auth**, **AWS (S3, SES, SQS)**, and optional **Sentry** for error tracking.

---

## Project structure

```
Eagle-Foundry/
├── backend/                 # Node.js API
│   ├── prisma/              # Schema & migrations
│   ├── src/
│   │   ├── app.ts           # Express app & routes
│   │   ├── index.ts         # Server entry, DB connect, graceful shutdown
│   │   ├── config/          # Env, constants
│   │   ├── connectors/      # DB, S3, SES, SQS, Sentry, logger
│   │   ├── events/          # Event builders & publishing
│   │   ├── middlewares/     # Auth, RBAC, validation, rate limit, errors
│   │   ├── modules/         # Feature modules (auth, students, orgs, etc.)
│   │   ├── types/
│   │   └── utils/
│   ├── tests/               # Unit & integration tests
│   ├── docs/                # Deployment & API docs
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── favicon_logo/            # App favicons & web manifest
├── logos/                   # Brand logos
└── README.md
```

---

## Quick start (backend)

### Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** (Docker)
- **AWS** account (for S3, SES, SQS in production)

### 1. Clone and install

```bash
cd backend
cp .env.example .env
# Edit .env with your values (see Environment variables below)
npm install
```

### 2. Database

```bash
# Start Postgres (if using Docker)
docker-compose up -d db

# Run migrations
npm run db:migrate

# Seed (optional)
npm run db:seed
```

### 3. Run the server

```bash
npm run dev
```

API: `http://localhost:3000`  
Health: `http://localhost:3000/health`

---

## Environment variables

Copy `backend/.env.example` to `backend/.env` and set:


| Variable                                                                                        | Description                                            |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `NODE_ENV`                                                                                      | `development` | `production` | `test`                  |
| `PORT`                                                                                          | Server port (default `3000`)                           |
| `DATABASE_URL`                                                                                  | PostgreSQL connection URL                              |
| `JWT_ACCESS_SECRET`                                                                             | Min 32 chars for access tokens                         |
| `JWT_REFRESH_SECRET`                                                                            | Min 32 chars for refresh tokens                        |
| `JWT_ACCESS_EXPIRES_IN`                                                                         | e.g. `15m`                                             |
| `JWT_REFRESH_EXPIRES_IN`                                                                        | e.g. `7d`                                              |
| `STUDENT_EMAIL_DOMAIN`                                                                          | Allowed domain for student signup (e.g. `ashland.edu`) |
| `BLOCKED_EMAIL_DOMAINS`                                                                         | Comma-separated blocked domains for company signup     |
| `OTP_TTL_MINUTES`, `OTP_MAX_ATTEMPTS`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_SEND_LIMIT_PER_HOUR` | OTP behavior                                           |
| `OTP_HASH_PEPPER`                                                                               | Min 16 chars for OTP hashing                           |
| `AWS_REGION`, `S3_BUCKET_NAME`, `SES_FROM_EMAIL`, `SQS_EVENTS_QUEUE_URL`                        | AWS config                                             |
| `SENTRY_DSN`                                                                                    | Optional; leave empty to disable Sentry                |


See `backend/.env.example` for a full list and defaults.

---

## Backend scripts


| Script                    | Description                         |
| ------------------------- | ----------------------------------- |
| `npm run dev`             | Start with hot reload (`tsx watch`) |
| `npm run build`           | Compile TypeScript to `dist/`       |
| `npm start`               | Run `node dist/index.js`            |
| `npm run db:generate`     | Generate Prisma client              |
| `npm run db:migrate`      | Run migrations (dev)                |
| `npm run db:migrate:prod` | Deploy migrations (production)      |
| `npm run db:seed`         | Seed database                       |
| `npm run db:studio`       | Open Prisma Studio                  |
| `npm test`                | Run Vitest (watch)                  |
| `npm run test:run`        | Run tests once                      |
| `npm run lint`            | ESLint on `src`                     |
| `npm run typecheck`       | `tsc --noEmit`                      |


---

## Docker

**Development (DB only):**

```bash
cd backend
docker-compose up -d db
```

**Production image:**

```bash
cd backend
docker build -t eagle-foundry-backend .
docker run -d -p 3000:3000 --env-file .env eagle-foundry-backend
```

See `backend/docs/deployment.md` for deployment details (ECS, RDS, SQS, etc.).

---

## API overview

- **Base URL:** `http://localhost:3000` (or your host)
- **Prefix:** `/api`
- **Auth:** Bearer token in `Authorization` header for protected routes
- **Responses:** JSON with `success`, `data`, and optional `meta` (e.g. pagination) or `error` with `code` and `message`


| Area          | Path                 | Description                                                           |
| ------------- | -------------------- | --------------------------------------------------------------------- |
| Health        | `GET /health`        | Liveness/readiness                                                    |
| Auth          | `/api/auth`          | Signup, login, OTP, refresh, logout, password reset                   |
| Students      | `/api/students`      | Profile, portfolio, resume presign                                    |
| Orgs          | `/api/orgs`          | List, get org; company: my org, members                               |
| Startups      | `/api/startups`      | CRUD, submit, archive, team; nested join-requests                     |
| Join requests | `/api/join-requests` | My requests, cancel; patch status (founder)                           |
| Opportunities | `/api/opportunities` | List, get; company: create, update, publish, close                    |
| Applications  | `/api/applications`  | My applications, withdraw; company: get, update status; nested create |
| Messaging     | `/api/messages`      | Threads, messages, send                                               |
| Notifications | `/api/notifications` | List, unread count, mark read, delete                                 |
| Files         | `/api/files`         | Presign upload, confirm, download URL, delete                         |
| Search        | `/api/search`        | Global search (startups, opportunities, students, orgs)               |
| Admin         | `/api/admin`         | Dashboard, startup review, users, orgs, audit logs                    |
| Moderation    | `/api/reports`       | Create report, my reports; admin: pending, resolve                    |


**Detailed API reference:** [backend/docs/API.md](backend/docs/API.md)

---

## Roles and access


| Role               | Description                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `STUDENT`          | Profile, portfolio, startups, join requests, applications, search                         |
| `COMPANY_ADMIN`    | Org management, add/remove members, create/publish/close opportunities, view applications |
| `COMPANY_MEMBER`   | View org and opportunities; view applications for org opportunities                       |
| `UNIVERSITY_ADMIN` | Admin dashboard, startup review, user/org status, reports, audit logs                     |


---

## Tech stack (backend)

- **Runtime:** Node.js 20+
- **Framework:** Express 4
- **Language:** TypeScript
- **ORM:** Prisma 5 (PostgreSQL)
- **Validation:** Zod
- **Auth:** JWT (access + refresh), bcrypt, OTP (email)
- **Storage:** AWS S3 (presigned uploads)
- **Email:** AWS SES
- **Queue:** AWS SQS (events)
- **Logging:** Pino
- **Errors:** Sentry (optional)
- **Security:** Helmet, CORS, rate limiting
- **Tests:** Vitest, Supertest

---

## License

ISC