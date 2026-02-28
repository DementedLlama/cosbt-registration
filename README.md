# COSBT Camp Hotel Registration

A web application for Church of Singapore (Bukit Timah) to manage hotel room registrations for church camps. Members submit their room details online; the admin team manages events, pricing, registrations, and payment tracking through a protected admin panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router, TypeScript) |
| Database | PostgreSQL 16 via Prisma 7 (driver-adapter mode) |
| Auth | NextAuth.js v4 — JWT, Credentials provider |
| Email | AWS SES (gracefully skipped if not configured) |
| File storage | AWS S3 (gracefully skipped if not configured) |
| Styling | Tailwind CSS |
| Validation | Zod v4 (server), React Hook Form (client) |
| Encryption | AES-256-GCM for passport/NRIC numbers at rest |

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- Docker (for the local Postgres database)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd cosbt-camp-registration
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the local database

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port 5432 with:
- Database: `cosbt_camp`
- Username: `cosbt`
- Password: `cosbt`

### 4. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Database (the .env file already has the local Docker URL)
DATABASE_URL="postgresql://cosbt:cosbt@localhost:5432/cosbt_camp"

# NextAuth — generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Encryption key for passport numbers — generate with: openssl rand -hex 32
ENCRYPTION_KEY="your-64-char-hex-key-here"

# AWS SES (optional — email is skipped gracefully if not set)
AWS_REGION="ap-southeast-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_SES_FROM_EMAIL="noreply@yourdomain.com"

# AWS S3 (optional — file storage is skipped gracefully if not set)
AWS_S3_BUCKET="your-bucket-name"
```

### 5. Run database migrations and seed

```bash
npx prisma db push        # apply schema to local DB
npx prisma db seed        # create the default SUPER_ADMIN user
```

The seed creates one admin account:
- **Email:** `admin@cosbt.org.sg`
- **Password:** `changeme123`

> Change this password immediately after first login.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the public registration portal.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin panel.

---

## Project Structure

```
src/
├── app/
│   ├── (public)/               # Public-facing pages (no auth required)
│   │   ├── page.tsx            # Landing page
│   │   └── register/
│   │       ├── page.tsx        # Multi-step registration wizard
│   │       └── confirmation/   # Post-submission confirmation page
│   ├── (admin-public)/         # Admin pages without sidebar (login)
│   │   └── admin/login/
│   ├── admin/                  # Protected admin panel (requires auth)
│   │   ├── layout.tsx          # Sidebar navigation, role-aware links
│   │   ├── dashboard/
│   │   ├── events/
│   │   ├── pricing/
│   │   ├── registrations/
│   │   └── users/              # SUPER_ADMIN only
│   └── api/
│       ├── auth/               # NextAuth handler
│       ├── registrations/      # POST: public registration submission
│       └── admin/              # Admin CRUD APIs (events, pricing, users, registrations)
├── components/
│   ├── registration/
│   │   └── RegistrationWizard.tsx   # 3-step form wizard (client component)
│   ├── admin/
│   │   └── SignOutButton.tsx         # Client-side sign-out
│   └── providers/
│       └── SessionProvider.tsx
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client singleton
│   ├── encryption.ts    # AES-256-GCM for passport numbers
│   ├── invoice.ts       # Invoice number generation (COSBT-YYYY-NNNN)
│   ├── audit.ts         # Immutable audit log writer
│   ├── email.ts         # AWS SES email sender
│   └── s3.ts            # AWS S3 helpers
├── middleware.ts         # Route protection + role-based access control
└── types/
    └── next-auth.d.ts   # Extended session types
```

---

## User Roles

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Full access including User Accounts management |
| `ADMIN` | All admin pages except User Accounts |
| `VIEW_ONLY` | Read-only access to admin pages |

---

## Registration Flow

1. Member opens `/register` — sees the active camp event details
2. **Step 1 — Contact Details**: Room In-Charge name, email, mobile, church, PDPA consent
3. **Step 2 — Room Occupants**: Add up to 3 adults (or students) + children; live price estimate updates in real time
4. **Step 3 — Review & Submit**: Summary of all details before submitting
5. On success: confirmation page with invoice number + email sent to Room In-Charge

**Room package types** (determined automatically by adult count):

- **Single** — 1 adult/student
- **Twin** — 2 adults/students
- **Triple** — 3 adults/students (maximum per room)

Children (Primary school ages 7–12, and Preschool ages 0–6) do not affect the package type. A maximum of 1 extra bed (CWB) is allowed per room.

---

## What's Implemented

- [x] Database schema (Prisma) — all models, enums, relations
- [x] Authentication — admin login, JWT sessions, sign-out
- [x] Role-based middleware — route protection, SUPER_ADMIN gate
- [x] Admin layout — sidebar navigation, user info, role display
- [x] Public landing page
- [x] Registration wizard (3-step, live pricing, confirmation page)
- [x] POST `/api/registrations` — full validation, pricing, invoice generation, DB write, audit log, email
- [x] Passport/NRIC encryption at rest (AES-256-GCM)
- [x] Audit logging (immutable, best-effort)
- [x] AWS SES email integration (graceful skip if not configured)
- [x] AWS S3 helpers (graceful skip if not configured)
- [x] Admin dashboard (summary cards — data fetch coming)
- [x] Seed script (creates default SUPER_ADMIN)

## Coming Next

- [ ] Admin: Camp Events CRUD (create, edit, activate/deactivate)
- [ ] Admin: Pricing configuration per event
- [ ] Admin: Registrations list with search and filters
- [ ] Admin: Registration detail view (rooms, occupants, payment status)
- [ ] Admin: Payment status update (mark as paid)
- [ ] Admin: User Accounts management (create, deactivate, reset password)
- [ ] Admin: Export registrations to Excel/CSV

---

## Deployment (Vercel + AWS RDS)

### Environment Variables on Vercel

In your Vercel project dashboard → Settings → Environment Variables, add all variables from `.env.example` with production values. Critical ones:

- `DATABASE_URL` — your AWS RDS PostgreSQL connection string
- `NEXTAUTH_SECRET` — a strong random secret (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — your production domain (e.g. `https://camp.cosbt.org.sg`)
- `ENCRYPTION_KEY` — a 64-character hex key (`openssl rand -hex 32`) — **never change this after go-live** or all stored passport numbers become unreadable

### Database

Run these against your production database before the first deploy:

```bash
DATABASE_URL="<prod-url>" npx prisma db push
DATABASE_URL="<prod-url>" npx prisma db seed
```

### Deploy

Push to `main` — Vercel will auto-deploy.

---

## Security Notes

- All passport/NRIC numbers are encrypted before storage using AES-256-GCM. The `ENCRYPTION_KEY` must be kept secret and **never rotated** after data is written.
- Admin sessions expire after 8 hours.
- The `/admin/*` routes (except `/admin/login`) are protected at the middleware level.
- Audit logs are append-only and record all admin actions and registration submissions.
- PDPA consent is captured with a timestamp on every registration.

---

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript type check
npx prisma studio    # GUI database browser
npx prisma db push   # Sync schema to DB (dev)
npx prisma db seed   # Re-run seed script
```
